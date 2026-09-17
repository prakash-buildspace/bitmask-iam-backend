import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ApiCategory } from './entities/ApiCategory.entity.js';

@Module({
  imports: [SequelizeModule.forFeature([ApiCategory])],
  controllers: [],
  providers: [],
  exports: [SequelizeModule],
})
export class ApiCategoryModule {}
