import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module.js';
import { HealthModule } from './health/health.module.js';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
