import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { expect, describe, beforeEach, afterEach, it } from 'vitest';
import { AppModule } from './../src/app.module.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.environment).toBeDefined();
    expect(response.body.config).toBeDefined();
    expect(response.body.config.database.host).toBeDefined();
    expect(response.body.config.redis.host).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
