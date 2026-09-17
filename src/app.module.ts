import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';
import { ModulesModule } from './modules/modules.module.js';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
    ModulesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
