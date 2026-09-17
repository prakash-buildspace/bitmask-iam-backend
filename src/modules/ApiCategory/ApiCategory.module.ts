import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ApiEndpoint } from '../ApiEndpoint/entities/ApiEndpoint.entity.js';
import { BitSequenceModule } from '../BitSequence/BitSequence.module.js';
import { ApiCategoryController } from './controllers/ApiCategory.controller.js';
import { ApiCategory } from './entities/ApiCategory.entity.js';
import { ApiCategoryService } from './services/ApiCategory.service.js';

@Module({
  imports: [
    SequelizeModule.forFeature([ApiCategory, ApiEndpoint]),
    BitSequenceModule,
  ],
  controllers: [ApiCategoryController],
  providers: [ApiCategoryService],
  exports: [ApiCategoryService, SequelizeModule],
})
export class ApiCategoryModule {}
