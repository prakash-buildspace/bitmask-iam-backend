import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service.js';
import type { HealthStatusResponse } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Get application health and runtime configuration status',
  })
  @ApiResponse({
    status: 200,
    description: 'Service health details and sanitized configuration',
  })
  getHealth(): HealthStatusResponse {
    return this.healthService.getHealth();
  }
}
