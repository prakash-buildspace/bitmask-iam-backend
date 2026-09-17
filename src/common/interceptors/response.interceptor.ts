import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable, Subscription } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { runWithCorrelationId } from '../utils/correlation-context.js';

// Standard API response format
export interface StandardApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data?: T;
  timestamp: string;
  path: string;
  duration: string;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<StandardApiResponse | unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Bypass response formatting for file downloads
    if (request.url.includes('/download')) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        if (response.headersSent) {
          return data;
        }

        const statusCode = response.statusCode || 200;
        const duration = `${Date.now() - startTime}ms`;

        // Determine message based on status code
        let message = 'Success';
        if (statusCode === 201) {
          message = 'Created';
        } else if (statusCode === 204) {
          message = 'No Content';
        }

        this.logger.debug(
          `[${request.method}] ${request.url} - ${statusCode} (${duration})`,
        );

        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data &&
          'data' in data &&
          'meta' in data
        ) {
          return data;
        }

        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'statusCode' in data &&
          'filters' in data &&
          'data' in data &&
          'timestamp' in data
        ) {
          return data;
        }

        // If data is already an envelope with success property (v2 envelope)
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          ('data' in data || 'count' in data)
        ) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
            duration,
          };
        }

        // If data is already in standard format, return as-is
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'message' in data
        ) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
            path: request.url,
            duration,
          };
        }

        // Otherwise, wrap in standard format
        return {
          statusCode,
          message,
          data: data ?? null,
          timestamp: new Date().toISOString(),
          path: request.url,
          duration,
        } as StandardApiResponse;
      }),
    );
  }
}

/**
 * Request Logging Interceptor
 * Logs incoming requests and outgoing responses with correlation IDs
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const correlationId = this.getCorrelationId(request);

    // Attach correlation ID to request for logging throughout the request lifecycle
    (request as Request & { correlationId?: string }).correlationId =
      correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const startTime = Date.now();
    const { method, url, headers, ip } = request;

    const idColor = this.getColorForId(correlationId);
    const blue = '\x1b[34m'; // Blue color
    const reset = '\x1b[0m'; // Reset color
    // Parse and colorize URL query parameters beautifully
    const urlParts = url.split('?');
    const pathPart = urlParts[0];
    let coloredQuery = '';

    if (urlParts.length > 1) {
      const qs = urlParts.slice(1).join('?');
      const pairs = qs.split('&');

      const symColor = '\x1b[90m'; // Grey for ?, &, =
      const keyColor = '\x1b[36m'; // Cyan for keys
      const valColor = '\x1b[32m'; // Green for values

      const coloredPairs = pairs.map((pair) => {
        const [key, ...valParts] = pair.split('=');
        const val = valParts.join('=');
        return val
          ? `${keyColor}${key}${symColor}=${valColor}${val}`
          : `${keyColor}${key}`;
      });

      coloredQuery = `${symColor}?${coloredPairs.join(`${symColor}&`)}`;
    }

    const coloredUrl = coloredQuery ? `${pathPart}${coloredQuery}` : pathPart;

    this.logger.log(
      `${idColor}[${correlationId}]${reset} ${blue}Incoming request: ${method} ${coloredUrl}${reset}`,
      {
        ip,
        userAgent: headers['user-agent'],
      },
    );

    return new Observable<unknown>((subscriber) => {
      let subscription: Subscription | undefined;

      runWithCorrelationId(correlationId, () => {
        subscription = next
          .handle()
          .pipe(
            tap({
              next: () => {
                const duration = Date.now() - startTime;
                const statusCode = response.statusCode || 200;
                const statusColor =
                  statusCode >= 500
                    ? '\x1b[31m' // Red
                    : statusCode >= 400
                      ? '\x1b[33m' // Yellow
                      : '\x1b[32m'; // Green
                this.logger.log(
                  `${idColor}[${correlationId}]${reset} Request completed: ${method} ${url} ${statusColor}${statusCode}${reset} (${duration}ms)`,
                );
              },
              error: (error: unknown) => {
                const duration = Date.now() - startTime;
                const red = '\x1b[31m';
                this.logger.warn(
                  `${idColor}[${correlationId}]${reset} ${red}Request failed: ${method} ${url}${reset} (${duration}ms)`,
                  error instanceof Error ? error.stack : String(error),
                );
              },
            }),
          )
          .subscribe({
            next: (value) => subscriber.next(value),
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete(),
          });
      });

      return () => subscription?.unsubscribe();
    });
  }

  private getCorrelationId(request: Request): string {
    const header = request.headers['x-correlation-id'];

    if (Array.isArray(header)) {
      return header[0] || randomUUID();
    }

    return header || randomUUID();
  }

  private getColorForId(id: string): string {
    const colors = [
      '\x1b[36m', // Cyan
      '\x1b[94m', // Light Blue
      '\x1b[35m', // Magenta
      '\x1b[32m', // Green
      '\x1b[33m', // Yellow
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  }
}
