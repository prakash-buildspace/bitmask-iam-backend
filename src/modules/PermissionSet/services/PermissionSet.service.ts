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
import {
  CreatePermissionSetDto,
  ListPermissionSetDto,
  UpdatePermissionSetDto,
} from '../dto/PermissionSet.dto.js';
import { PermissionSet } from '../entities/PermissionSet.entity.js';

@Injectable()
export class PermissionSetService {
  private readonly logger = new Logger(PermissionSetService.name);

  constructor(
    @InjectModel(PermissionSet)
    private readonly permissionSetModel: typeof PermissionSet,
  ) {}

  // create a new permission set
  async createPermissionSet(
    dto: CreatePermissionSetDto,
  ): Promise<PermissionSet> {
    try {
      // step 1: validate that required name is provided
      if (!dto?.name || !dto.name.trim()) {
        throw new ValidationException('PermissionSet name is required');
      }

      const permissionSetName = dto.name.trim();

      // step 2: check if permission set name is already taken
      const existingPermissionSet = await this.permissionSetModel.findOne({
        where: { permissionSetName },
      });

      if (existingPermissionSet) {
        if (existingPermissionSet.status === RecordStatus.DELETED) {
          // release legacy soft-deleted record's name so new record can reuse the name
          const deletedSuffix = `__deleted_${existingPermissionSet.id}_${Date.now()}`;
          const maxBaseLength = this.getColumnMaxLength('permissionSetName') - deletedSuffix.length;
          existingPermissionSet.permissionSetName = `${permissionSetName.slice(0, maxBaseLength)}${deletedSuffix}`;
          await existingPermissionSet.save();
        } else {
          throw new ConflictException(
            `PermissionSet with name "${permissionSetName}" already exists`,
          );
        }
      }

      const permissionSetDescription = dto.description ? dto.description.trim() : null;

      // step 3: persist the record to database
      this.logger.log(`Creating PermissionSet: ${permissionSetName}`);

      return await this.permissionSetModel.create({
        permissionSetName,
        permissionSetDescription,
        isSystemPermissionSet: 0,
        status: RecordStatus.ACTIVE,
      });
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error('Failed to create PermissionSet', error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to create PermissionSet in database');
    }
  }

  // update an existing permission set by id
  async updatePermissionSet(
    id: number,
    dto: UpdatePermissionSetDto,
  ): Promise<PermissionSet> {
    try {
      // step 1: validate id parameter
      if (!id || id <= 0 || !Number.isInteger(Number(id))) {
        throw new ValidationException('A valid positive integer ID is required');
      }

      // step 2: validate name if supplied
      if (dto.name !== undefined && !dto.name.trim()) {
        throw new ValidationException('PermissionSet name cannot be empty');
      }

      // step 3: ensure at least one update field is provided
      const hasName = dto.name !== undefined && dto.name.trim() !== '';
      const hasDescription = dto.description !== undefined;
      const hasStatus = dto.status !== undefined;

      if (!hasName && !hasDescription && !hasStatus) {
        throw new ValidationException(
          'At least one field (name, description, or status) must be provided for update',
        );
      }

      // step 4: find target record in database
      const permissionSet = await this.permissionSetModel.findByPk(id);

      if (!permissionSet) {
        throw new ResourceNotFoundException(
          `PermissionSet with ID ${id} not found`,
          'PermissionSet',
        );
      }

      if (permissionSet.status === RecordStatus.DELETED) {
        throw new ValidationException(
          `PermissionSet with ID ${id} has been deleted and cannot be recovered or updated`,
        );
      }

      // step 5: protect immutable system-level permission sets from any modification
      if (Number(permissionSet.isSystemPermissionSet) === 1) {
        throw new ValidationException(
          `PermissionSet "${permissionSet.permissionSetName}" is a predefined system PermissionSet and cannot be modified`,
        );
      }

      // step 6: check name uniqueness if name is being changed
      if (hasName && dto.name!.trim() !== permissionSet.permissionSetName) {
        const updatedPermissionSetName = dto.name!.trim();
        const existingPermissionSet = await this.permissionSetModel.findOne({
          where: {
            permissionSetName: updatedPermissionSetName,
            id: { [Op.ne]: id },
          },
        });

        if (existingPermissionSet) {
          if (existingPermissionSet.status === RecordStatus.DELETED) {
            // release legacy soft-deleted record's name so current record can adopt this name
            const deletedSuffix = `__deleted_${existingPermissionSet.id}_${Date.now()}`;
            const maxBaseLength = this.getColumnMaxLength('permissionSetName') - deletedSuffix.length;
            existingPermissionSet.permissionSetName = `${updatedPermissionSetName.slice(0, maxBaseLength)}${deletedSuffix}`;
            await existingPermissionSet.save();
          } else {
            throw new ConflictException(
              `PermissionSet with name "${updatedPermissionSetName}" already exists`,
            );
          }
        }

        permissionSet.permissionSetName = updatedPermissionSetName;
      }

      // step 7: update description if provided
      if (hasDescription) {
        permissionSet.permissionSetDescription = dto.description ? dto.description.trim() : null;
      }

      // step 8: update status if provided
      if (hasStatus) {
        permissionSet.status = dto.status!;
      }

      // step 9: save changes to database
      await permissionSet.save();
      this.logger.log(`Updated PermissionSet: [${id}] ${permissionSet.permissionSetName}`);

      return permissionSet;
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error(`Failed to update PermissionSet [${id}]`, error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to update PermissionSet in database');
    }
  }

  // delete a permission set by id
  async deletePermissionSet(
    id: number,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // step 1: validate id parameter
      if (!id || id <= 0 || !Number.isInteger(Number(id))) {
        throw new ValidationException('A valid positive integer ID is required');
      }

      // step 2: find target record in database
      const permissionSet = await this.permissionSetModel.findByPk(id);

      if (!permissionSet || permissionSet.status === RecordStatus.DELETED) {
        throw new ResourceNotFoundException(
          `PermissionSet with ID ${id} not found`,
          'PermissionSet',
        );
      }

      // step 3: protect immutable system-level permission sets from deletion
      if (Number(permissionSet.isSystemPermissionSet) === 1) {
        throw new ValidationException(
          `PermissionSet "${permissionSet.permissionSetName}" is a predefined system PermissionSet and cannot be deleted`,
        );
      }

      // step 4: release unique name for future reuse and mark status as DELETED
      const deletedSuffix = `__deleted_${id}_${Date.now()}`;
      const maxBaseLength = this.getColumnMaxLength('permissionSetName') - deletedSuffix.length;
      const baseName = permissionSet.permissionSetName.slice(0, maxBaseLength);
      permissionSet.permissionSetName = `${baseName}${deletedSuffix}`;
      permissionSet.status = RecordStatus.DELETED;
      await permissionSet.save();
      this.logger.log(`Soft-deleted PermissionSet: [${id}] (released name "${baseName}")`);

      return {
        success: true,
        message: `PermissionSet with ID ${id} was successfully deleted`,
      };
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error(`Failed to delete PermissionSet [${id}]`, error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to delete PermissionSet in database');
    }
  }

  // list permission sets with optional filters and pagination
  async listPermissionSet(
    filters: ListPermissionSetDto = new ListPermissionSetDto(),
  ): Promise<{ rows: PermissionSet[]; count: number }> {
    try {
      // step 1: construct where clause dynamically
      const filterConditions: WhereOptions = {};

      if (filters.id !== undefined) {
        filterConditions.id = filters.id;
      }

      // step 2: sanitize search name by escaping SQL LIKE wildcard characters
      if (filters.name && filters.name.trim()) {
        const sanitizedSearchName = filters.name
          .trim()
          .replace(/[%_\\]/g, '\\$&');
        filterConditions.permissionSetName = {
          [Op.like]: `%${sanitizedSearchName}%`,
        };
      }

      if (filters.status !== undefined) {
        filterConditions.status = filters.status;
      } else {
        // step 3: exclude soft-deleted records by default
        filterConditions.status = { [Op.ne]: RecordStatus.DELETED };
      }

      if (filters.isSystem !== undefined) {
        filterConditions.isSystemPermissionSet = filters.isSystem;
      }

      // step 4: enforce safe pagination boundaries
      const paginationLimit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
      const paginationOffset = Math.max(Number(filters.offset) || 0, 0);

      // step 4: fetch matching records with total count
      return await this.permissionSetModel.findAndCountAll({
        where: filterConditions,
        order: [['id', 'ASC']],
        limit: paginationLimit,
        offset: paginationOffset,
      });
    } catch (error) {
      if (error instanceof AppException || error instanceof BaseError) {
        throw error;
      }
      this.logger.error('Failed to list PermissionSets', error instanceof Error ? error.stack : error);
      throw new DatabaseException('Failed to list PermissionSets from database');
    }
  }

  // dynamically extract column max length from model metadata
  private getColumnMaxLength(fieldName: string): number {
    const attr = (this.permissionSetModel.getAttributes() as Record<string, any>)?.[fieldName];
    return attr?.type?.options?.length ?? attr?.type?._length ?? 255;
  }
}
