import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import {
  BaseError as SequelizeBaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
} from 'sequelize';
import { AppException } from '../exceptions/app.exception.js';

type ErrorMessage = string | string[];


@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: HttpException, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Handle custom AppException
    if (exception instanceof AppException) {
      this.logger.warn(`[${request.method}] ${request.url}`, {
        statusCode,
        errorCode: exception.errorCode,
        message: exception.message,
      });

      if (
        statusCode === HttpStatus.TOO_MANY_REQUESTS &&
        exception.details?.retryAfter
      ) {
        response.setHeader('Retry-After', String(exception.details.retryAfter));
      }

      const responseBody = {
        statusCode: exception.statusCode,
        errorCode: exception.errorCode,
        message: exception.message,
        details: exception.details,
        timestamp: exception.timestamp,
        path: request.url,
      };

      return httpAdapter.reply(response, responseBody, statusCode);
    }

    // Handle standard NestJS HttpException
    const message = this.getExceptionMessage(exceptionResponse, exception);
    const errorCode = this.getErrorCode(statusCode);

    if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      response.setHeader('Retry-After', '60');
    }

    this.logger.warn(`[${request.method}] ${request.url}`, {
      statusCode,
      errorCode,
      message,
    });

    const responseBody = {
      statusCode,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    httpAdapter.reply(response, responseBody, statusCode);
  }

  private getExceptionMessage(
    exceptionResponse: string | object,
    exception: HttpException,
  ): ErrorMessage {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if ('message' in exceptionResponse) {
      const message = exceptionResponse.message;

      if (typeof message === 'string' || Array.isArray(message)) {
        return message;
      }
    }

    return exception.message;
  }

  private getErrorCode(statusCode: HttpStatus): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        return 'VALIDATION_ERROR';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMITED';
      default:
        return 'HTTP_ERROR';
    }
  }
}

@Catch(
  UniqueConstraintError,
  ForeignKeyConstraintError,
  SequelizeValidationError,
  SequelizeBaseError,
)
export class DatabaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Handle UniqueConstraintError
    if (exception instanceof UniqueConstraintError) {
      const field = Object.keys(exception.fields ?? {})[0] ?? 'field';
      this.logger.warn(`Unique constraint violation: ${field}`, {
        path: request.url,
        field,
      });

      return httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'CONFLICT',
          message: `${field} already exists`,
          details: { field },
          timestamp: new Date().toISOString(),
          path: request.url,
        },
        HttpStatus.CONFLICT,
      );
    }

    // Handle ForeignKeyConstraintError
    if (exception instanceof ForeignKeyConstraintError) {
      this.logger.warn('Foreign key constraint violation', {
        path: request.url,
        table: exception.table,
      });

      return httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.CONFLICT,
          errorCode: 'CONFLICT',
          message: 'Invalid reference to related record',
          details: { table: exception.table },
          timestamp: new Date().toISOString(),
          path: request.url,
        },
        HttpStatus.CONFLICT,
      );
    }

    // Handle ValidationError
    if (exception instanceof SequelizeValidationError) {
      const details = exception.errors.map((error) => ({
        field: error.path,
        message: error.message,
      }));

      this.logger.warn('Validation error', {
        path: request.url,
        details,
      });

      return httpAdapter.reply(
        response,
        {
          statusCode: HttpStatus.BAD_REQUEST,
          errorCode: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
          timestamp: new Date().toISOString(),
          path: request.url,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const error = exception as SequelizeBaseError;


    const errorId = randomUUID();
    this.logger.error(`Database error [errorId=${errorId}]`, {
      errorId,
      path: request.url,
      error: error.message,
      stack: error.stack,
    });

    httpAdapter.reply(
      response,
      {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'DATABASE_ERROR',
        message: 'Database operation failed',
        errorId,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const errorId = randomUUID();
    this.logger.error(`Uncaught exception [errorId=${errorId}]`, {
      errorId,
      error: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
      path: request.url,
    });

    const responseBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_ERROR',
      message: 'Internal server error',
      errorId,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    httpAdapter.reply(response, responseBody, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
