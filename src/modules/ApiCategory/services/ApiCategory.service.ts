import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { BaseError, Op, type WhereOptions } from 'sequelize';
import {
  AppException,
  ConflictException,
  DatabaseException,
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/app.exception.js';
import { RecordStatus } from '../../../common/constants/status.constant.js';
import { ApiEndpoint } from '../../ApiEndpoint/entities/ApiEndpoint.entity.js';
import { BitSequenceService } from '../../BitSequence/services/BitSequence.service.js';
import {
  CreateApiCategoryDto,
  ListApiCategoryDto,
  UpdateApiCategoryDto,
} from '../dto/ApiCategory.dto.js';
import { ApiCategory } from '../entities/ApiCategory.entity.js';

@Injectable()
export class ApiCategoryService {
  private readonly logger = new Logger(ApiCategoryService.name);

  constructor(
    @InjectModel(ApiCategory)
    private readonly apiCategoryModel: typeof ApiCategory,
    @InjectModel(ApiEndpoint)
    private readonly apiEndpointModel: typeof ApiEndpoint,
    private readonly bitSequenceService: BitSequenceService,
  ) {}

  // create a new api category
  async createApiCategory(
    dto: CreateApiCategoryDto,
  ): Promise<ApiCategory> {
    try {
      // step 1: validate that required category name is provided
      if (!dto?.categoryName || !dto.categoryName.trim()) {
        throw new ValidationException('Category name is required');
      }

      const categoryName = dto.categoryName.trim();
      const categoryTag = dto.categoryTag ? dto.categoryTag.trim().toLowerCase() : null;

      // step 2: check if category name is already taken
      const existingCategoryByName = await this.apiCategoryModel.findOne({
        where: { categoryName },
      });

      if (existingCategoryByName) {
        if (existingCategoryByName.status === RecordStatus.DELETED) {
          // release legacy soft-deleted record's name so new record can reuse the name
          const deletedSuffix = `__deleted_${existingCategoryByName.id}_${Date.now()}`;
          const maxBaseLength = this.getColumnMaxLength('categoryName') - deletedSuffix.length;
          existingCategoryByName.categoryName = `${categoryName.slice(0, maxBaseLength)}${deletedSuffix}`;
          await existingCategoryByName.save();
        } else {
          throw new ConflictException(
            `ApiCategory with name "${categoryName}" already exists`,
          );
        }
      }

      // step 3: check if category tag is already taken when provided
      if (categoryTag) {
        const existingCategoryByTag = await this.apiCategoryModel.findOne({
          where: { categoryTag },
        });

        if (existingCategoryByTag) {
          if (existingCategoryByTag.status === RecordStatus.DELETED) {
            // release legacy soft-deleted record's tag so new record can reuse the tag
            const deletedSuffix = `__deleted_${existingCategoryByTag.id}_${Date.now()}`;
            const maxBaseLength = this.getColumnMaxLength('categoryTag') - deletedSuffix.length;
            existingCategoryByTag.categoryTag = `${categoryTag.slice(0, maxBaseLength)}${deletedSuffix}`;
            await existingCategoryByTag.save();
          } else {
            throw new ConflictException(
              `ApiCategory with tag "${categoryTag}" already exists`,
            );
          }
        }
      }

      // step 4: allocate next sequential bit index using BitSequenceService (dynamically validates against BitmapConfig)
      const bitIndex = await this.bitSequenceService.allocateCategoryBitIndex();

      this.logger.log(`Creating ApiCategory: ${categoryName} (bitIndex: ${bitIndex})`);
      const createdCategory = await this.apiCategoryModel.create({
        categoryName,
        categoryTag,
        bitIndex,
        status: RecordStatus.ACTIVE,
      });

      return createdCategory;
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error('Failed to create ApiCategory', error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to create ApiCategory in database');
    }
  }

  // update an existing api category by id
  async updateApiCategory(
    id: number,
    dto: UpdateApiCategoryDto,
  ): Promise<ApiCategory> {
    try {
      // step 1: validate id parameter
      if (!id || id <= 0 || !Number.isInteger(Number(id))) {
        throw new ValidationException('A valid positive integer ID is required');
      }

      // step 2: validate name and tag if supplied
      if (dto.categoryName !== undefined && !dto.categoryName.trim()) {
        throw new ValidationException('Category name cannot be empty');
      }
      if (dto.categoryTag !== undefined && !dto.categoryTag.trim()) {
        throw new ValidationException('Category tag cannot be empty');
      }

      // step 3: ensure at least one update field is provided
      const hasName = dto.categoryName !== undefined && dto.categoryName.trim() !== '';
      const hasTag = dto.categoryTag !== undefined && dto.categoryTag.trim() !== '';
      const hasStatus = dto.status !== undefined;

      if (!hasName && !hasTag && !hasStatus) {
        throw new ValidationException(
          'At least one field (categoryName, categoryTag, or status) must be provided for update',
        );
      }

      // step 4: find target record in database
      const apiCategory = await this.apiCategoryModel.findByPk(id);

      if (!apiCategory) {
        throw new ResourceNotFoundException(
          `ApiCategory with ID ${id} not found`,
          'ApiCategory',
        );
      }

      if (apiCategory.status === RecordStatus.DELETED) {
        throw new ValidationException(
          `ApiCategory with ID ${id} has been deleted and cannot be recovered or updated`,
        );
      }

      // step 5: check name uniqueness if name is being changed
      if (hasName && dto.categoryName!.trim() !== apiCategory.categoryName) {
        const updatedCategoryName = dto.categoryName!.trim();
        const existingCategory = await this.apiCategoryModel.findOne({
          where: {
            categoryName: updatedCategoryName,
            id: { [Op.ne]: id },
          },
        });

        if (existingCategory) {
          if (existingCategory.status === RecordStatus.DELETED) {
            // release legacy soft-deleted record's name so current record can adopt this name
            const deletedSuffix = `__deleted_${existingCategory.id}_${Date.now()}`;
            const maxBaseLength = this.getColumnMaxLength('categoryName') - deletedSuffix.length;
            existingCategory.categoryName = `${updatedCategoryName.slice(0, maxBaseLength)}${deletedSuffix}`;
            await existingCategory.save();
          } else {
            throw new ConflictException(
              `ApiCategory with name "${updatedCategoryName}" already exists`,
            );
          }
        }

        apiCategory.categoryName = updatedCategoryName;
      }

      // step 6: check tag uniqueness if tag is being changed
      if (hasTag && dto.categoryTag!.trim().toLowerCase() !== apiCategory.categoryTag) {
        const updatedCategoryTag = dto.categoryTag!.trim().toLowerCase();
        const existingCategory = await this.apiCategoryModel.findOne({
          where: {
            categoryTag: updatedCategoryTag,
            id: { [Op.ne]: id },
          },
        });

        if (existingCategory) {
          if (existingCategory.status === RecordStatus.DELETED) {
            // release legacy soft-deleted record's tag so current record can adopt this tag
            const deletedSuffix = `__deleted_${existingCategory.id}_${Date.now()}`;
            const maxBaseLength = this.getColumnMaxLength('categoryTag') - deletedSuffix.length;
            existingCategory.categoryTag = `${updatedCategoryTag.slice(0, maxBaseLength)}${deletedSuffix}`;
            await existingCategory.save();
          } else {
            throw new ConflictException(
              `ApiCategory with tag "${updatedCategoryTag}" already exists`,
            );
          }
        }

        apiCategory.categoryTag = updatedCategoryTag;
      }

      // step 7: update status if provided
      if (hasStatus) {
        apiCategory.status = dto.status!;
      }

      // step 8: save changes to database
      await apiCategory.save();
      this.logger.log(`Updated ApiCategory: [${id}] ${apiCategory.categoryName}`);

      return apiCategory;
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error(`Failed to update ApiCategory [${id}]`, error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to update ApiCategory in database');
    }
  }

  // delete an api category by id
  async deleteApiCategory(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // step 1: validate id parameter
      if (!id || id <= 0 || !Number.isInteger(Number(id))) {
        throw new ValidationException('A valid positive integer ID is required');
      }

      // step 2: find target record in database
      const apiCategory = await this.apiCategoryModel.findByPk(id);

      if (!apiCategory || apiCategory.status === RecordStatus.DELETED) {
        throw new ResourceNotFoundException(
          `ApiCategory with ID ${id} not found`,
          'ApiCategory',
        );
      }

      // step 3: verify no active child API endpoints exist under this category
      const activeEndpointsCount = await this.apiEndpointModel.count({
        where: {
          apiCategoryId: id,
          status: { [Op.ne]: RecordStatus.DELETED },
        },
      });

      if (activeEndpointsCount > 0) {
        throw new ConflictException(
          `Cannot delete ApiCategory with ID ${id} because it still contains ${activeEndpointsCount} active API endpoint(s). Please delete or reassign them first.`,
        );
      }

      // step 4: release unique name and tag for future reuse and mark status as DELETED
      const deletedSuffix = `__deleted_${id}_${Date.now()}`;
      const maxNameLength = this.getColumnMaxLength('categoryName') - deletedSuffix.length;
      const baseName = apiCategory.categoryName.slice(0, maxNameLength);
      apiCategory.categoryName = `${baseName}${deletedSuffix}`;

      if (apiCategory.categoryTag) {
        const maxTagLength = this.getColumnMaxLength('categoryTag') - deletedSuffix.length;
        const baseTag = apiCategory.categoryTag.slice(0, maxTagLength);
        apiCategory.categoryTag = `${baseTag}${deletedSuffix}`;
      }

      apiCategory.status = RecordStatus.DELETED;
      await apiCategory.save();
      this.logger.log(`Soft-deleted ApiCategory: [${id}] (released name "${baseName}")`);

      return {
        success: true,
        message: `ApiCategory with ID ${id} was successfully deleted`,
      };
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error(`Failed to delete ApiCategory [${id}]`, error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to delete ApiCategory in database');
    }
  }

  // list api categories with optional filters and pagination
  async listApiCategory(
    filters: ListApiCategoryDto = new ListApiCategoryDto(),
  ): Promise<{ rows: ApiCategory[]; count: number }> {
    try {
      // step 1: construct where clause dynamically
      const filterConditions: WhereOptions = {};

      if (filters.id !== undefined) {
        filterConditions.id = filters.id;
      }

      // step 2: sanitize search name by escaping SQL LIKE wildcard characters
      if (filters.categoryName && filters.categoryName.trim()) {
        const sanitizedSearchName = filters.categoryName
          .trim()
          .replace(/[%_\\]/g, '\\$&');
        filterConditions.categoryName = {
          [Op.like]: `%${sanitizedSearchName}%`,
        };
      }

      // step 3: filter by exact tag if provided
      if (filters.categoryTag && filters.categoryTag.trim()) {
        filterConditions.categoryTag = filters.categoryTag.trim().toLowerCase();
      }

      // step 4: handle status filtering and exclude soft-deleted records by default
      if (filters.status !== undefined) {
        filterConditions.status = filters.status;
      } else {
        filterConditions.status = { [Op.ne]: RecordStatus.DELETED };
      }

      // step 5: enforce safe pagination boundaries
      const paginationLimit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
      const paginationOffset = Math.max(Number(filters.offset) || 0, 0);

      // step 6: fetch matching records with total count
      return await this.apiCategoryModel.findAndCountAll({
        where: filterConditions,
        order: [['id', 'ASC']],
        limit: paginationLimit,
        offset: paginationOffset,
      });
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error('Failed to list ApiCategories', error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to list ApiCategories from database');
    }
  }

  // dynamically extract column max length from model metadata
  private getColumnMaxLength(fieldName: string): number {
    const attr = (this.apiCategoryModel.getAttributes() as Record<string, any>)?.[fieldName];
    return attr?.type?.options?.length ?? attr?.type?._length ?? 255;
  }
}
