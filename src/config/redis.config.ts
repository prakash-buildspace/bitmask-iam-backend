import { registerAs } from '@nestjs/config';

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true',
  required: process.env.REDIS_REQUIRED !== 'false',
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'bit-iam:',
}));