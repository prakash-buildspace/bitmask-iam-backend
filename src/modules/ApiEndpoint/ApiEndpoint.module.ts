import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ApiEndpoint } from './entities/ApiEndpoint.entity.js';

@Module({
  imports: [SequelizeModule.forFeature([ApiEndpoint])],
  controllers: [],
  providers: [],
  exports: [SequelizeModule],
})
export class ApiEndpointModule {}
