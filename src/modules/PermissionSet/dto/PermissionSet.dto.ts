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

// create permission set payload
export class CreatePermissionSetDto {
  @ApiProperty({
    example: 'USER_MANAGER',
    description: 'Unique name of the permission set',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a valid string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9_\-\s]+$/, {
    message: 'Name can only contain letters, numbers, spaces, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({
    example: 'Grants access to view and manage application users',
    description: 'Detailed description of the permission set',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;
}

// update permission set payload
export class UpdatePermissionSetDto {
  @ApiPropertyOptional({
    example: 'USER_ADMIN',
    description: 'Updated name of the permission set',
    minLength: 2,
    maxLength: 100,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a valid string' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9_\-\s]+$/, {
    message: 'Name can only contain letters, numbers, spaces, underscores and hyphens',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated access scope description',
    description: 'Updated description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Status: 1 for active, 0 for inactive',
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Status must be an integer' })
  @IsIn([0, 1], { message: 'Status must be either 0 (inactive) or 1 (active)' })
  status?: number;
}

// list query filters payload
export class ListPermissionSetDto {
  @ApiPropertyOptional({
    description: 'Filter by specific permission set ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'ID must be an integer' })
  @Min(1, { message: 'ID must be a positive integer' })
  id?: number;

  @ApiPropertyOptional({
    description: 'Search pattern for permission set name',
  })
  @IsOptional()
  @IsString({ message: 'Name query must be a string' })
  @MaxLength(100, { message: 'Search term cannot exceed 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;

  @ApiPropertyOptional({
    description: 'Filter by status: 1=active, 0=inactive',
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Status must be an integer' })
  @IsIn([0, 1], { message: 'Status must be 0 or 1' })
  status?: number;

  @ApiPropertyOptional({
    description: 'Filter by system flag: 1=system predefined, 0=custom',
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'isSystem must be an integer' })
  @IsIn([0, 1], { message: 'isSystem must be 0 or 1' })
  isSystem?: number;

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
