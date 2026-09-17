import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthStatusResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  environment: string;
  version: string;
  config: {
    app: {
      port: number;
      apiPrefix: string;
      apiVersion: string;
      serverUrls: string;
    };
    database: {
      host: string;
      port: number;
      name: string;
      sync: boolean;
      logging: boolean;
      poolMax: number;
      poolMin: number;
    };
    redis: {
      host: string;
      port: number;
      tls: boolean;
      required: boolean;
      keyPrefix: string;
    };
    swagger: {
      enabled: boolean;
      path: string;
    };
  };
  system: {
    memoryUsage: NodeJS.MemoryUsage;
    nodeVersion: string;
  };
}

@Injectable()
export class HealthService {
  constructor(private readonly configService: ConfigService) {}

  getHealth(): HealthStatusResponse {
    const nodeEnv =
      this.configService.get<string>('NODE_ENV') || 'development';
    const port = Number(this.configService.get<number>('PORT')) || 5001;
    const apiPrefix = this.configService.get<string>('API_PREFIX') || 'api';
    const apiVersion = this.configService.get<string>('API_VERSION') || '1';
    const serverUrls =
      process.env.SERVER_URLS ||
      this.configService.get<string>('SERVER_URLS') ||
      '';

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      environment: nodeEnv,
      version: apiVersion,
      config: {
        app: {
          port,
          apiPrefix,
          apiVersion,
          serverUrls,
        },
        database: {
          host: this.configService.get<string>('DB_HOST') || '127.0.0.1',
          port: Number(this.configService.get<number>('DB_PORT')) || 3306,
          name: this.configService.get<string>('DB_NAME') || '',
          sync: `${this.configService.get<string>('DB_SYNC')}` === 'true',
          logging: `${this.configService.get<string>('DB_LOGGING')}` === 'true',
          poolMax: Number(this.configService.get<number>('DB_POOL_MAX')) || 10,
          poolMin: Number(this.configService.get<number>('DB_POOL_MIN')) || 0,
        },
        redis: {
          host: this.configService.get<string>('REDIS_HOST') || '127.0.0.1',
          port: Number(this.configService.get<number>('REDIS_PORT')) || 6379,
          tls: `${this.configService.get<string>('REDIS_TLS')}` === 'true',
          required:
            `${this.configService.get<string>('REDIS_REQUIRED')}` !== 'false',
          keyPrefix:
            this.configService.get<string>('REDIS_KEY_PREFIX') || 'bit-iam:',
        },
        swagger: {
          enabled:
            `${this.configService.get<string>('SWAGGER_ENABLED') ?? 'true'}`.toLowerCase() ===
            'true',
          path: this.configService.get<string>('SWAGGER_PATH') || 'api/doc',
        },
      },
      system: {
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
      },
    };
  }
}
