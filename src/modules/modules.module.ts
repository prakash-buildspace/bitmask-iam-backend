import { Module } from '@nestjs/common';
import { ApiCategoryModule } from './ApiCategory/ApiCategory.module.js';
import { ApiEndpointModule } from './ApiEndpoint/ApiEndpoint.module.js';
import { PermissionSetModule } from './PermissionSet/PermissionSet.module.js';

@Module({
  imports: [
    ApiCategoryModule,
    ApiEndpointModule,
    PermissionSetModule,
  ],
  controllers: [],
  providers: [],
  exports: [
    ApiCategoryModule,
    ApiEndpointModule,
    PermissionSetModule,
  ],
})
export class ModulesModule {}
