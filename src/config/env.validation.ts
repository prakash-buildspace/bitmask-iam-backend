import 'reflect-metadata';
import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 5001))
  @IsOptional()
  PORT: number = 5001;

  @IsString()
  @IsNotEmpty()
  API_PREFIX: string = 'api';

  @IsString()
  @IsNotEmpty()
  API_VERSION: string = '1';

  @IsString()
  @IsOptional()
  SERVER_URLS?: string;

  // Swagger Documentation
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  SWAGGER_ENABLED: boolean = true;

  @IsString()
  @IsOptional()
  SWAGGER_PATH: string = 'api/doc';

  @IsString()
  @IsNotEmpty()
  SWAGGER_BASIC_AUTH_USERNAME!: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_BASIC_AUTH_PASSWORD!: string;

  // MySQL Database Configuration (Sequelize)
  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @IsInt()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 3306))
  DB_PORT: number = 3306;

  @IsString()
  @IsNotEmpty()
  DB_USER!: string;

  @IsString()
  @IsOptional()
  DB_PASS?: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME!: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  DB_SYNC: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  DB_LOGGING: boolean = false;

  @IsInt()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 10))
  @IsOptional()
  DB_POOL_MAX: number = 10;

  @IsInt()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 0))
  @IsOptional()
  DB_POOL_MIN: number = 0;

  @IsInt()
  @Transform(({ value }) =>
    value !== undefined ? parseInt(value, 10) : 30000,
  )
  @IsOptional()
  DB_POOL_ACQUIRE: number = 30000;

  @IsInt()
  @Transform(({ value }) =>
    value !== undefined ? parseInt(value, 10) : 10000,
  )
  @IsOptional()
  DB_POOL_IDLE: number = 10000;

  @IsInt()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 3))
  @IsOptional()
  DB_RETRY_ATTEMPTS: number = 3;

  @IsInt()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 3000))
  @IsOptional()
  DB_RETRY_DELAY: number = 3000;

  // Redis Configuration
  @IsString()
  @IsNotEmpty()
  REDIS_HOST!: string;

  @IsInt()
  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 6379))
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  REDIS_TLS: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === undefined || value === 'true' || value === true)
  @IsOptional()
  REDIS_REQUIRED: boolean = true;

  @IsString()
  @IsOptional()
  REDIS_KEY_PREFIX: string = 'bit-iam:';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((error) => {
        const constraints = Object.values(error.constraints || {}).join(', ');
        return `${error.property}: ${constraints}`;
      })
      .join('; ');
    throw new Error(`Environment validation failed: ${formattedErrors}`);
  }

  return validatedConfig;
}
