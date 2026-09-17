import { Module } from '@nestjs/common';
import { ApiCategoryModule } from './ApiCategory/ApiCategory.module.js';
import { ApiEndpointModule } from './ApiEndpoint/ApiEndpoint.module.js';
import { BitSequenceModule } from './BitSequence/BitSequence.module.js';
import { PermissionSetModule } from './PermissionSet/PermissionSet.module.js';

@Module({
  imports: [
    ApiCategoryModule,
    ApiEndpointModule,
    BitSequenceModule,
    PermissionSetModule,
  ],
  controllers: [],
  providers: [],
  exports: [
    ApiCategoryModule,
    ApiEndpointModule,
    BitSequenceModule,
    PermissionSetModule,
  ],
})
export class ModulesModule {}
