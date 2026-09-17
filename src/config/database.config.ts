import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  pass: process.env.DB_PASS || '',
  name: process.env.DB_NAME || 'iam_testing_db',
  sync: process.env.DB_SYNC === 'true',
  logging: process.env.DB_LOGGING === 'true',
  pool: {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
  },
  retry: {
    attempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3', 10),
    delay: parseInt(process.env.DB_RETRY_DELAY || '3000', 10),
  },
}));