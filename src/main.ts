import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as crypto from 'crypto';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module.js';
import {
  HttpExceptionFilter,
  AllExceptionsFilter,
  DatabaseExceptionFilter,
} from './common/filters/exception.filter.js';
import {
  ResponseInterceptor,
  RequestLoggingInterceptor,
} from './common/interceptors/response.interceptor.js';

if (!(global as any).crypto) {
  (global as any).crypto = crypto;
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    forceCloseConnections: true,
    bufferLogs: true,
  });

  const config = app.get(ConfigService);
  const httpAdapterHost = app.get(HttpAdapterHost);
  const apiPrefix = config.get<string>('API_PREFIX') || 'api';


  // Global request validation (DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Interceptors (order matters: RequestLogging -> Response)
  app.useGlobalInterceptors(
    new RequestLoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // Global exception filters
  app.useGlobalFilters(
    new AllExceptionsFilter(httpAdapterHost),
    new DatabaseExceptionFilter(httpAdapterHost),
    new HttpExceptionFilter(httpAdapterHost),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: config.get<string>('API_VERSION') || '1',
  });

  // Allow any origin (CORS *). Use for development or public APIs.
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-csrf-token',
      'Accept',
      'Origin',
      'X-Requested-With',
    ],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix(apiPrefix);

  const swaggerEnabled =
    `${config.get<string>('SWAGGER_ENABLED') ?? 'true'}`.toLowerCase() ===
    'true';

  if (swaggerEnabled) {
    const rawSwaggerPath = (
      config.get<string>('SWAGGER_PATH') || 'api/doc'
    ).trim();
    const swaggerPath = `/${rawSwaggerPath.replace(/^\/+/, '')}`;
    const swaggerJsonPath = `${swaggerPath}-json`;
    const serverUrlsRaw = (
      process.env.SERVER_URLS ||
      config.get<string>('SERVER_URLS') ||
      ''
    ).trim();
    const swaggerBasicAuthUsername = config.getOrThrow<string>(
      'SWAGGER_BASIC_AUTH_USERNAME',
    );
    const swaggerBasicAuthPassword = config.getOrThrow<string>(
      'SWAGGER_BASIC_AUTH_PASSWORD',
    );

    const swaggerBuilder = new DocumentBuilder()
      .setTitle('Bitmap IAM Backend API')
      .setDescription('Backend APIs for Bitmap IAM operations.')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          in: 'header',
          description: 'Enter the JWT access token returned by login.',
        },
        'bearer',
      );

    if (serverUrlsRaw) {
      const serverUrls = serverUrlsRaw
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean);

      serverUrls.forEach((url) => swaggerBuilder.addServer(url));
    }

    const swaggerConfig = swaggerBuilder.build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    app.use(
      [swaggerPath, swaggerJsonPath],
      basicAuth({
        challenge: true,
        users: { [swaggerBasicAuthUsername]: swaggerBasicAuthPassword },
      }),
    );

    SwaggerModule.setup(swaggerPath, app, document);
  }

  const port = config.get<number>('PORT') || 5001;
  await app.listen(port);

  Logger.log(
    `Bitmap IAM API started successfully on port ${port}`,
    'Bootstrap',
  );
}

void bootstrap();
