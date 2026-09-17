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

// create api category payload
export class CreateApiCategoryDto {
  @ApiProperty({
    example: 'AUTH_MANAGEMENT',
    description: 'Unique name of the API category',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Category name must be a valid string' })
  @IsNotEmpty({ message: 'Category name cannot be empty' })
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9_\-\s]+$/, {
    message: 'Category name can only contain letters, numbers, spaces, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  categoryName!: string;

  @ApiPropertyOptional({
    example: 'auth',
    description: 'Unique tag identifier for the API category',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Category tag must be a string' })
  @MinLength(2, { message: 'Category tag must be at least 2 characters long' })
  @MaxLength(100, { message: 'Category tag cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Category tag can only contain letters, numbers, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  categoryTag?: string;
}

// update api category payload
export class UpdateApiCategoryDto {
  @ApiPropertyOptional({
    example: 'USER_MANAGEMENT',
    description: 'Updated name of the API category',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Category name must be a valid string' })
  @MinLength(2, { message: 'Category name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Category name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9_\-\s]+$/, {
    message: 'Category name can only contain letters, numbers, spaces, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  categoryName?: string;

  @ApiPropertyOptional({
    example: 'users',
    description: 'Updated tag for the API category',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Category tag must be a string' })
  @MinLength(2, { message: 'Category tag must be at least 2 characters long' })
  @MaxLength(100, { message: 'Category tag cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Category tag can only contain letters, numbers, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  categoryTag?: string;

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
export class ListApiCategoryDto {
  @ApiPropertyOptional({
    description: 'Filter by specific API category ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID must be an integer' })
  @Min(1, { message: 'ID must be a positive integer' })
  id?: number;

  @ApiPropertyOptional({
    description: 'Search pattern for category name',
  })
  @IsOptional()
  @IsString({ message: 'Category name query must be a string' })
  @MaxLength(100, { message: 'Search term cannot exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  categoryName?: string;

  @ApiPropertyOptional({
    description: 'Filter by exact category tag',
  })
  @IsOptional()
  @IsString({ message: 'Category tag query must be a string' })
  @MaxLength(100, { message: 'Category tag cannot exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  categoryTag?: string;

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
