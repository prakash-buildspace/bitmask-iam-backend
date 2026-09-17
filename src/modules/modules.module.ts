import { Module } from '@nestjs/common';
import { PermissionSetModule } from './PermissionSet/PermissionSet.module.js';

@Module({
  imports: [PermissionSetModule],
  controllers: [],
  providers: [],
  exports: [PermissionSetModule],
})
export class ModulesModule {}
