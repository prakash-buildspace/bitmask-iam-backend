import { registerAs } from '@nestjs/config';

export const swaggerConfig = registerAs('swagger', () => ({
  enabled: `${process.env.SWAGGER_ENABLED ?? 'true'}`.toLowerCase() === 'true',
  path: (process.env.SWAGGER_PATH || 'api/doc').trim(),
  username: process.env.SWAGGER_BASIC_AUTH_USERNAME || 'developer',
  password: process.env.SWAGGER_BASIC_AUTH_PASSWORD || '',
}));
