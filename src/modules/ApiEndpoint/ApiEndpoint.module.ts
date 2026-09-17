import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ApiCategory } from '../ApiCategory/entities/ApiCategory.entity.js';
import { BitSequenceModule } from '../BitSequence/BitSequence.module.js';
import { ApiEndpointController } from './controllers/ApiEndpoint.controller.js';
import { ApiEndpoint } from './entities/ApiEndpoint.entity.js';
import { ApiEndpointService } from './services/ApiEndpoint.service.js';

@Module({
  imports: [
    SequelizeModule.forFeature([ApiEndpoint, ApiCategory]),
    BitSequenceModule,
  ],
  controllers: [ApiEndpointController],
  providers: [ApiEndpointService],
  exports: [ApiEndpointService, SequelizeModule],
})
export class ApiEndpointModule {}
