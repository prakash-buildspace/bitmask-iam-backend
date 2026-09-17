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
  CreatePermissionSetDto,
  ListPermissionSetDto,
  UpdatePermissionSetDto,
} from '../dto/PermissionSet.dto.js';
import { PermissionSetService } from '../services/PermissionSet.service.js';

@ApiTags('Permission Sets')
@Controller('permissionSets')
export class PermissionSetController {
  constructor(private readonly permissionSetService: PermissionSetService) {}

  // create a new permission set
  @Post('createPermissionSet')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new permission set' })
  @ApiResponse({ status: 201, description: 'Permission set created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Permission set name already exists' })
  async createPermissionSet(@Body() createPermissionSetDto: CreatePermissionSetDto) {
    return this.permissionSetService.createPermissionSet(createPermissionSetDto);
  }

  // list permission sets with optional filters and pagination
  @Get('listPermissionSet')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List permission sets with optional search and pagination' })
  @ApiResponse({ status: 200, description: 'List of permission sets returned successfully' })
  async listPermissionSet(@Query() queryFiltersDto: ListPermissionSetDto) {
    return this.permissionSetService.listPermissionSet(queryFiltersDto);
  }

  // update a permission set by id
  @Patch('updatePermissionSet/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an existing permission set by ID' })
  @ApiParam({ name: 'id', description: 'Permission set unique ID', type: Number })
  @ApiResponse({ status: 200, description: 'Permission set updated successfully' })
  @ApiResponse({ status: 404, description: 'Permission set not found' })
  @ApiResponse({ status: 409, description: 'Permission set name already taken' })
  async updatePermissionSet(
    @Param('id', ParseIntPipe) permissionSetId: number,
    @Body() updatePermissionSetDto: UpdatePermissionSetDto,
  ) {
    return this.permissionSetService.updatePermissionSet(
      permissionSetId,
      updatePermissionSetDto,
    );
  }

  // delete a permission set by id
  @Delete('deletePermissionSet/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a permission set by ID' })
  @ApiParam({ name: 'id', description: 'Permission set unique ID', type: Number })
  @ApiResponse({ status: 200, description: 'Permission set deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete system-level immutable permission sets' })
  @ApiResponse({ status: 404, description: 'Permission set not found' })
  async deletePermissionSet(@Param('id', ParseIntPipe) permissionSetId: number) {
    return this.permissionSetService.deletePermissionSet(permissionSetId);
  }
}
