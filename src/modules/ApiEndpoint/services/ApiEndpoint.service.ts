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
import { ApiCategory } from '../../ApiCategory/entities/ApiCategory.entity.js';
import { BitSequenceService } from '../../BitSequence/services/BitSequence.service.js';
import {
  CreateApiEndpointDto,
  ListApiEndpointDto,
  UpdateApiEndpointDto,
} from '../dto/ApiEndpoint.dto.js';
import { ApiEndpoint } from '../entities/ApiEndpoint.entity.js';

@Injectable()
export class ApiEndpointService {
  private readonly logger = new Logger(ApiEndpointService.name);

  constructor(
    @InjectModel(ApiEndpoint)
    private readonly apiEndpointModel: typeof ApiEndpoint,
    @InjectModel(ApiCategory)
    private readonly apiCategoryModel: typeof ApiCategory,
    private readonly bitSequenceService: BitSequenceService,
  ) {}

  // create a new api endpoint
  async createApiEndpoint(
    dto: CreateApiEndpointDto,
  ): Promise<ApiEndpoint> {
    try {
      // step 1: validate required inputs
      if (!dto?.apiCategoryId || dto.apiCategoryId <= 0) {
        throw new ValidationException('A valid parent API category ID is required');
      }
      if (!dto?.apiEndpoint || !dto.apiEndpoint.trim()) {
        throw new ValidationException('API endpoint path is required');
      }
      if (!dto?.endpointTag || !dto.endpointTag.trim()) {
        throw new ValidationException('Endpoint tag is required');
      }

      const apiEndpoint = dto.apiEndpoint.trim();
      const httpMethod = (dto.httpMethod || 'GET').trim().toUpperCase();
      const endpointTag = dto.endpointTag.trim();

      // step 2: verify parent api category exists and is not soft-deleted
      const parentCategory = await this.apiCategoryModel.findByPk(dto.apiCategoryId);
      if (!parentCategory || parentCategory.status === RecordStatus.DELETED) {
        throw new ValidationException(
          `Parent ApiCategory with ID ${dto.apiCategoryId} does not exist or has been deleted`,
        );
      }

      // step 3: check if endpoint tag is already taken
      const existingByTag = await this.apiEndpointModel.findOne({
        where: { endpointTag },
      });

      if (existingByTag) {
        if (existingByTag.status === RecordStatus.DELETED) {
          // release legacy soft-deleted record's tag so new record can reuse the tag
          const deletedSuffix = `__deleted_${existingByTag.id}_${Date.now()}`;
          const maxBaseLength = this.getColumnMaxLength('endpointTag') - deletedSuffix.length;
          existingByTag.endpointTag = `${endpointTag.slice(0, maxBaseLength)}${deletedSuffix}`;
          await existingByTag.save();
        } else {
          throw new ConflictException(
            `ApiEndpoint with tag "${endpointTag}" already exists`,
          );
        }
      }

      // step 4: check if route combination (apiEndpoint + httpMethod) already exists among non-deleted endpoints
      const existingByRoute = await this.apiEndpointModel.findOne({
        where: {
          apiEndpoint,
          httpMethod,
          status: { [Op.ne]: RecordStatus.DELETED },
        },
      });

      if (existingByRoute) {
        throw new ConflictException(
          `ApiEndpoint with route "${httpMethod} ${apiEndpoint}" already exists`,
        );
      }

      // step 5: allocate next sequential bit index using BitSequenceService (dynamically validates against BitmapConfig)
      const bitIndex = await this.bitSequenceService.allocateApiBitIndex();

      this.logger.log(
        `Creating ApiEndpoint: [${httpMethod}] ${apiEndpoint} (tag: ${endpointTag}, bitIndex: ${bitIndex})`,
      );
      const createdEndpoint = await this.apiEndpointModel.create({
        apiCategoryId: dto.apiCategoryId,
        apiEndpoint,
        httpMethod,
        endpointTag,
        bitIndex,
        status: RecordStatus.ACTIVE,
      });

      return createdEndpoint;
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error('Failed to create ApiEndpoint', error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to create ApiEndpoint in database');
    }
  }

  // update an existing api endpoint by id
  async updateApiEndpoint(
    id: number,
    dto: UpdateApiEndpointDto,
  ): Promise<ApiEndpoint> {
    try {
      // step 1: validate id parameter
      if (!id || id <= 0 || !Number.isInteger(Number(id))) {
        throw new ValidationException('A valid positive integer ID is required');
      }

      // step 2: validate input fields if supplied
      if (dto.apiCategoryId !== undefined && (!dto.apiCategoryId || dto.apiCategoryId <= 0)) {
        throw new ValidationException('API category ID must be a positive integer');
      }
      if (dto.apiEndpoint !== undefined && !dto.apiEndpoint.trim()) {
        throw new ValidationException('API endpoint path cannot be empty');
      }
      if (dto.endpointTag !== undefined && !dto.endpointTag.trim()) {
        throw new ValidationException('Endpoint tag cannot be empty');
      }

      // step 3: ensure at least one update field is provided
      const hasCategory = dto.apiCategoryId !== undefined;
      const hasEndpoint = dto.apiEndpoint !== undefined && dto.apiEndpoint.trim() !== '';
      const hasMethod = dto.httpMethod !== undefined && dto.httpMethod.trim() !== '';
      const hasTag = dto.endpointTag !== undefined && dto.endpointTag.trim() !== '';
      const hasStatus = dto.status !== undefined;

      if (!hasCategory && !hasEndpoint && !hasMethod && !hasTag && !hasStatus) {
        throw new ValidationException(
          'At least one field must be provided for update',
        );
      }

      // step 4: find target record in database
      const apiEndpointRecord = await this.apiEndpointModel.findByPk(id);

      if (!apiEndpointRecord) {
        throw new ResourceNotFoundException(
          `ApiEndpoint with ID ${id} not found`,
          'ApiEndpoint',
        );
      }

      if (apiEndpointRecord.status === RecordStatus.DELETED) {
        throw new ValidationException(
          `ApiEndpoint with ID ${id} has been deleted and cannot be recovered or updated`,
        );
      }

      // step 5: verify parent category exists if apiCategoryId is changed
      if (hasCategory && dto.apiCategoryId !== apiEndpointRecord.apiCategoryId) {
        const parentCategory = await this.apiCategoryModel.findByPk(dto.apiCategoryId);
        if (!parentCategory || parentCategory.status === RecordStatus.DELETED) {
          throw new ValidationException(
            `Parent ApiCategory with ID ${dto.apiCategoryId} does not exist or has been deleted`,
          );
        }
        apiEndpointRecord.apiCategoryId = dto.apiCategoryId!;
      }

      // step 6: check endpointTag uniqueness if tag is changed
      if (hasTag && dto.endpointTag!.trim() !== apiEndpointRecord.endpointTag) {
        const updatedTag = dto.endpointTag!.trim();
        const existingEndpoint = await this.apiEndpointModel.findOne({
          where: {
            endpointTag: updatedTag,
            id: { [Op.ne]: id },
          },
        });

        if (existingEndpoint) {
          if (existingEndpoint.status === RecordStatus.DELETED) {
            // release legacy soft-deleted record's tag so current record can adopt this tag
            const deletedSuffix = `__deleted_${existingEndpoint.id}_${Date.now()}`;
            const maxBaseLength = this.getColumnMaxLength('endpointTag') - deletedSuffix.length;
            existingEndpoint.endpointTag = `${updatedTag.slice(0, maxBaseLength)}${deletedSuffix}`;
            await existingEndpoint.save();
          } else {
            throw new ConflictException(
              `ApiEndpoint with tag "${updatedTag}" already exists`,
            );
          }
        }

        apiEndpointRecord.endpointTag = updatedTag;
      }

      // step 7: check route (apiEndpoint + httpMethod) conflict if route or method is changed
      const targetEndpoint = hasEndpoint ? dto.apiEndpoint!.trim() : apiEndpointRecord.apiEndpoint;
      const targetMethod = hasMethod
        ? dto.httpMethod!.trim().toUpperCase()
        : apiEndpointRecord.httpMethod;

      if (
        targetEndpoint !== apiEndpointRecord.apiEndpoint ||
        targetMethod !== apiEndpointRecord.httpMethod
      ) {
        const existingRoute = await this.apiEndpointModel.findOne({
          where: {
            apiEndpoint: targetEndpoint,
            httpMethod: targetMethod,
            id: { [Op.ne]: id },
            status: { [Op.ne]: RecordStatus.DELETED },
          },
        });

        if (existingRoute) {
          throw new ConflictException(
            `ApiEndpoint with route "${targetMethod} ${targetEndpoint}" already exists`,
          );
        }

        apiEndpointRecord.apiEndpoint = targetEndpoint;
        apiEndpointRecord.httpMethod = targetMethod;
      }

      // step 8: update status if provided
      if (hasStatus) {
        apiEndpointRecord.status = dto.status!;
      }

      // step 9: save changes to database
      await apiEndpointRecord.save();
      this.logger.log(`Updated ApiEndpoint: [${id}] ${apiEndpointRecord.httpMethod} ${apiEndpointRecord.apiEndpoint}`);

      return apiEndpointRecord;
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error(`Failed to update ApiEndpoint [${id}]`, error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to update ApiEndpoint in database');
    }
  }

  // delete an api endpoint by id
  async deleteApiEndpoint(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // step 1: validate id parameter
      if (!id || id <= 0 || !Number.isInteger(Number(id))) {
        throw new ValidationException('A valid positive integer ID is required');
      }

      // step 2: find target record in database
      const apiEndpointRecord = await this.apiEndpointModel.findByPk(id);

      if (!apiEndpointRecord || apiEndpointRecord.status === RecordStatus.DELETED) {
        throw new ResourceNotFoundException(
          `ApiEndpoint with ID ${id} not found`,
          'ApiEndpoint',
        );
      }

      // step 3: release unique endpoint tag for future reuse and mark status as DELETED
      const deletedSuffix = `__deleted_${id}_${Date.now()}`;
      const maxBaseLength = this.getColumnMaxLength('endpointTag') - deletedSuffix.length;
      const baseTag = apiEndpointRecord.endpointTag.slice(0, maxBaseLength);
      apiEndpointRecord.endpointTag = `${baseTag}${deletedSuffix}`;
      apiEndpointRecord.status = RecordStatus.DELETED;
      await apiEndpointRecord.save();
      this.logger.log(`Soft-deleted ApiEndpoint: [${id}] (released tag "${baseTag}")`);

      return {
        success: true,
        message: `ApiEndpoint with ID ${id} was successfully deleted`,
      };
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error(`Failed to delete ApiEndpoint [${id}]`, error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to delete ApiEndpoint in database');
    }
  }

  // list api endpoints with optional filters and pagination
  async listApiEndpoint(
    filters: ListApiEndpointDto = new ListApiEndpointDto(),
  ): Promise<{ rows: ApiEndpoint[]; count: number }> {
    try {
      // step 1: construct where clause dynamically
      const filterConditions: WhereOptions = {};

      if (filters.id !== undefined) {
        filterConditions.id = filters.id;
      }

      if (filters.apiCategoryId !== undefined) {
        filterConditions.apiCategoryId = filters.apiCategoryId;
      }

      if (filters.httpMethod && filters.httpMethod.trim()) {
        filterConditions.httpMethod = filters.httpMethod.trim().toUpperCase();
      }

      // step 2: sanitize search endpoint route by escaping SQL LIKE wildcard characters
      if (filters.apiEndpoint && filters.apiEndpoint.trim()) {
        const sanitizedSearch = filters.apiEndpoint
          .trim()
          .replace(/[%_\\]/g, '\\$&');
        filterConditions.apiEndpoint = {
          [Op.like]: `%${sanitizedSearch}%`,
        };
      }

      // step 3: filter by exact endpoint tag if provided
      if (filters.endpointTag && filters.endpointTag.trim()) {
        filterConditions.endpointTag = filters.endpointTag.trim();
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

      // step 6: fetch matching records with parent category details and total count
      return await this.apiEndpointModel.findAndCountAll({
        where: filterConditions,
        include: [
          {
            model: this.apiCategoryModel,
            attributes: ['id', 'categoryName', 'categoryTag'],
            where: { status: { [Op.ne]: RecordStatus.DELETED } },
            required: false,
          },
        ],
        order: [['id', 'ASC']],
        limit: paginationLimit,
        offset: paginationOffset,
      });
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error('Failed to list ApiEndpoints', error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to list ApiEndpoints from database');
    }
  }

  // dynamically extract column max length from model metadata
  private getColumnMaxLength(fieldName: string): number {
    const attr = (this.apiEndpointModel.getAttributes() as Record<string, any>)?.[fieldName];
    return attr?.type?.options?.length ?? attr?.type?._length ?? 255;
  }
}
