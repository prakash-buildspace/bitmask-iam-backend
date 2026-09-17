import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PermissionSetController } from './controllers/PermissionSet.controller.js';
import { PermissionSet } from './entities/PermissionSet.entity.js';
import { PermissionSetService } from './services/PermissionSet.service.js';

@Module({
  imports: [SequelizeModule.forFeature([PermissionSet])],
  controllers: [PermissionSetController],
  providers: [PermissionSetService],
  exports: [PermissionSetService, SequelizeModule],
})
export class PermissionSetModule {}
