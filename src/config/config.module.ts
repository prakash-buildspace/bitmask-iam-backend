import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { appConfig } from './app.config.js';
import { swaggerConfig } from './swagger.config.js';
import { databaseConfig } from './database.config.js';
import { redisConfig } from './redis.config.js';
import { validate } from './env.validation.js';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        `.env.${process.env.NODE_ENV}.local`,
        `.env.${process.env.NODE_ENV}`,
        '.env.local',
        '.env',
      ],
      load: [appConfig, swaggerConfig, databaseConfig, redisConfig],
      validate,
    }),
  ],
})
export class AppConfigModule {}

export { AppConfigModule as configModule };