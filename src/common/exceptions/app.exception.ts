import { HttpException, HttpStatus } from '@nestjs/common';

export interface AppExceptionBody {
  statusCode: HttpStatus;
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export class AppException extends HttpException {
  public readonly statusCode: HttpStatus;
  public readonly errorCode: string;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly path?: string;

  constructor(
    message: string,
    statusCode: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: string = 'INTERNAL_ERROR',
    details?: Record<string, unknown>,
  ) {
    const timestamp = new Date().toISOString();
    super({ statusCode, errorCode, message, details, timestamp }, statusCode);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = timestamp;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): AppExceptionBody {
    return {
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

// Validation exception - for input validation errors
export class ValidationException extends AppException {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', details);
  }
}

// Authentication exception - for auth failures
export class AuthenticationException extends AppException {
  constructor(message: string = 'Authentication failed') {
    super(message, HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  }
}

// Authorization exception - for permission denied
export class AuthorizationException extends AppException {
  constructor(message: string = 'Access denied') {
    super(message, HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}

// Resource not found exception
export class ResourceNotFoundException extends AppException {
  constructor(message: string = 'Resource not found', resource?: string) {
    super(
      message,
      HttpStatus.NOT_FOUND,
      'NOT_FOUND',
      resource ? { resource } : undefined,
    );
  }
}

// Conflict exception - for duplicate/conflict errors
export class ConflictException extends AppException {
  constructor(message: string = 'Resource already exists') {
    super(message, HttpStatus.CONFLICT, 'CONFLICT');
  }
}

// Database exception - for DB-related errors
export class DatabaseException extends AppException {
  constructor(
    message: string = 'Database error occurred',
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatus.INTERNAL_SERVER_ERROR, 'DATABASE_ERROR', details);
  }
}

// Rate limit exception - for throttling
export class RateLimitException extends AppException {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(
      message,
      HttpStatus.TOO_MANY_REQUESTS,
      'RATE_LIMITED',
      retryAfter ? { retryAfter } : undefined,
    );
  }
}

// External service exception - for third-party service failures
export class ExternalServiceException extends AppException {
  constructor(
    message: string = 'External service error',
    service?: string,
    details?: Record<string, unknown>,
  ) {
    super(message, HttpStatus.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE', {
      service,
      ...details,
    });
  }
}
