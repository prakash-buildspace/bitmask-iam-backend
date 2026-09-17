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
  CreateApiEndpointDto,
  ListApiEndpointDto,
  UpdateApiEndpointDto,
} from '../dto/ApiEndpoint.dto.js';
import { ApiEndpointService } from '../services/ApiEndpoint.service.js';

@ApiTags('API Endpoints')
@Controller('apiEndpoints')
export class ApiEndpointController {
  constructor(private readonly apiEndpointService: ApiEndpointService) {}

  // create a new api endpoint
  @Post('createApiEndpoint')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new API endpoint' })
  @ApiResponse({ status: 201, description: 'API endpoint created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'API endpoint tag or route already exists' })
  async createApiEndpoint(@Body() createApiEndpointDto: CreateApiEndpointDto) {
    return this.apiEndpointService.createApiEndpoint(createApiEndpointDto);
  }

  // list api endpoints with optional filters and pagination
  @Get('listApiEndpoint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List API endpoints with optional search and pagination' })
  @ApiResponse({ status: 200, description: 'List of API endpoints returned successfully' })
  async listApiEndpoint(@Query() queryFiltersDto: ListApiEndpointDto) {
    return this.apiEndpointService.listApiEndpoint(queryFiltersDto);
  }

  // update an api endpoint by id
  @Patch('updateApiEndpoint/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing API endpoint by ID' })
  @ApiParam({ name: 'id', description: 'API endpoint unique ID', type: Number })
  @ApiResponse({ status: 200, description: 'API endpoint updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'API endpoint not found' })
  @ApiResponse({ status: 409, description: 'API endpoint tag or route already taken' })
  async updateApiEndpoint(
    @Param('id', ParseIntPipe) apiEndpointId: number,
    @Body() updateApiEndpointDto: UpdateApiEndpointDto,
  ) {
    return this.apiEndpointService.updateApiEndpoint(
      apiEndpointId,
      updateApiEndpointDto,
    );
  }

  // delete an api endpoint by id
  @Delete('deleteApiEndpoint/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an API endpoint by ID' })
  @ApiParam({ name: 'id', description: 'API endpoint unique ID', type: Number })
  @ApiResponse({ status: 200, description: 'API endpoint deleted successfully' })
  @ApiResponse({ status: 404, description: 'API endpoint not found' })
  async deleteApiEndpoint(@Param('id', ParseIntPipe) apiEndpointId: number) {
    return this.apiEndpointService.deleteApiEndpoint(apiEndpointId);
  }
}
