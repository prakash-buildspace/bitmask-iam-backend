import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateApiCategoryDto,
  ListApiCategoryDto,
  UpdateApiCategoryDto,
} from '../dto/ApiCategory.dto.js';
import { ApiCategoryService } from '../services/ApiCategory.service.js';

@ApiTags('API Categories')
@Controller('apiCategories')
export class ApiCategoryController {
  constructor(private readonly apiCategoryService: ApiCategoryService) {}

  // create a new api category
  @Post('createApiCategory')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API category' })
  @ApiResponse({ status: 201, description: 'API category created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'API category name or tag already exists' })
  async createApiCategory(@Body() createApiCategoryDto: CreateApiCategoryDto) {
    return this.apiCategoryService.createApiCategory(createApiCategoryDto);
  }

  // list api categories with optional filters and pagination
  @Get('listApiCategory')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List API categories with optional search and pagination' })
  @ApiResponse({ status: 200, description: 'List of API categories returned successfully' })
  async listApiCategory(@Query() queryFiltersDto: ListApiCategoryDto) {
    return this.apiCategoryService.listApiCategory(queryFiltersDto);
  }

  // update an api category by id
  @Patch('updateApiCategory/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing API category by ID' })
  @ApiParam({ name: 'id', description: 'API category unique ID', type: Number })
  @ApiResponse({ status: 200, description: 'API category updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'API category not found' })
  @ApiResponse({ status: 409, description: 'API category name or tag already taken' })
  async updateApiCategory(
    @Param('id', ParseIntPipe) apiCategoryId: number,
    @Body() updateApiCategoryDto: UpdateApiCategoryDto,
  ) {
    return this.apiCategoryService.updateApiCategory(
      apiCategoryId,
      updateApiCategoryDto,
    );
  }

  // delete an api category by id
  @Delete('deleteApiCategory/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API category by ID' })
  @ApiParam({ name: 'id', description: 'API category unique ID', type: Number })
  @ApiResponse({ status: 200, description: 'API category deleted successfully' })
  @ApiResponse({ status: 404, description: 'API category not found' })
  async deleteApiCategory(@Param('id', ParseIntPipe) apiCategoryId: number) {
    return this.apiCategoryService.deleteApiCategory(apiCategoryId);
  }
}
