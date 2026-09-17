import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// allowed HTTP methods
export const HTTP_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

// create api endpoint payload
export class CreateApiEndpointDto {
  @ApiProperty({
    example: 1,
    description: 'Unique ID of the parent API category',
  })
  @Type(() => Number)
  @IsInt({ message: 'API category ID must be an integer' })
  @Min(1, { message: 'API category ID must be a positive integer' })
  apiCategoryId!: number;

  @ApiProperty({
    example: '/api/v1/auth/login',
    description: 'API endpoint route path',
    minLength: 1,
    maxLength: 255,
  })
  @IsString({ message: 'API endpoint path must be a valid string' })
  @IsNotEmpty({ message: 'API endpoint path cannot be empty' })
  @MaxLength(255, { message: 'API endpoint path cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  apiEndpoint!: string;

  @ApiPropertyOptional({
    example: 'POST',
    description: 'HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    default: 'GET',
    enum: HTTP_METHODS,
  })
  @IsOptional()
  @IsString({ message: 'HTTP method must be a valid string' })
  @IsIn(HTTP_METHODS, {
    message: 'HTTP method must be one of: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  httpMethod: string = 'GET';

  @ApiProperty({
    example: 'auth:login',
    description: 'Unique tag identifier for the API endpoint',
    minLength: 2,
    maxLength: 255,
  })
  @IsString({ message: 'Endpoint tag must be a valid string' })
  @IsNotEmpty({ message: 'Endpoint tag cannot be empty' })
  @MinLength(2, { message: 'Endpoint tag must be at least 2 characters long' })
  @MaxLength(255, { message: 'Endpoint tag cannot exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9_:-]+$/, {
    message: 'Endpoint tag can only contain letters, numbers, colons, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  endpointTag!: string;
}

// update api endpoint payload
export class UpdateApiEndpointDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Updated ID of the parent API category',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'API category ID must be an integer' })
  @Min(1, { message: 'API category ID must be a positive integer' })
  apiCategoryId?: number;

  @ApiPropertyOptional({
    example: '/api/v1/auth/login',
    description: 'Updated API endpoint route path',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'API endpoint path must be a valid string' })
  @MinLength(1, { message: 'API endpoint path must be at least 1 character long' })
  @MaxLength(255, { message: 'API endpoint path cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  apiEndpoint?: string;

  @ApiPropertyOptional({
    example: 'POST',
    description: 'Updated HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
    enum: HTTP_METHODS,
  })
  @IsOptional()
  @IsString({ message: 'HTTP method must be a valid string' })
  @IsIn(HTTP_METHODS, {
    message: 'HTTP method must be one of: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  httpMethod?: string;

  @ApiPropertyOptional({
    example: 'auth:login',
    description: 'Updated tag identifier for the API endpoint',
    minLength: 2,
    maxLength: 255,
  })
  @IsOptional()
  @IsString({ message: 'Endpoint tag must be a valid string' })
  @MinLength(2, { message: 'Endpoint tag must be at least 2 characters long' })
  @MaxLength(255, { message: 'Endpoint tag cannot exceed 255 characters' })
  @Matches(/^[a-zA-Z0-9_:-]+$/, {
    message: 'Endpoint tag can only contain letters, numbers, colons, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  endpointTag?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Status: 1 for active, 0 for inactive. Note: soft-deleted (2) cannot be recovered',
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Status must be an integer' })
  @IsIn([0, 1], { message: 'Status must be either 0 (inactive) or 1 (active)' })
  status?: number;
}

// list query filters payload
export class ListApiEndpointDto {
  @ApiPropertyOptional({
    description: 'Filter by specific API endpoint ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID must be an integer' })
  @Min(1, { message: 'ID must be a positive integer' })
  id?: number;

  @ApiPropertyOptional({
    description: 'Filter by parent API category ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'API category ID must be an integer' })
  @Min(1, { message: 'API category ID must be a positive integer' })
  apiCategoryId?: number;

  @ApiPropertyOptional({
    description: 'Search pattern for API endpoint route path',
  })
  @IsOptional()
  @IsString({ message: 'API endpoint query must be a string' })
  @MaxLength(255, { message: 'Search term cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  apiEndpoint?: string;

  @ApiPropertyOptional({
    description: 'Filter by HTTP method',
    enum: HTTP_METHODS,
  })
  @IsOptional()
  @IsString({ message: 'HTTP method must be a valid string' })
  @IsIn(HTTP_METHODS, {
    message: 'HTTP method must be one of: GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  httpMethod?: string;

  @ApiPropertyOptional({
    description: 'Filter by exact endpoint tag',
  })
  @IsOptional()
  @IsString({ message: 'Endpoint tag query must be a string' })
  @MaxLength(255, { message: 'Endpoint tag cannot exceed 255 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  endpointTag?: string;

  @ApiPropertyOptional({
    description: 'Filter by status: 1=active, 0=inactive (deleted records excluded by default)',
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Status must be an integer' })
  @IsIn([0, 1], { message: 'Status must be 0 or 1' })
  status?: number;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Maximum number of items to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit: number = 20;

  @ApiPropertyOptional({
    example: 0,
    default: 0,
    description: 'Number of items to skip for pagination',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset cannot be negative' })
  offset: number = 0;
}
