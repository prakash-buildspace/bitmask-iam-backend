import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { expect, describe, beforeAll, afterAll, it } from 'vitest';
import { Op } from 'sequelize';
import { AppModule } from '../src/app.module.js';
import { ApiCategory } from '../src/modules/ApiCategory/entities/ApiCategory.entity.js';
import { ApiEndpoint } from '../src/modules/ApiEndpoint/entities/ApiEndpoint.entity.js';
import { RecordStatus } from '../src/common/constants/status.constant.js';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js';
import {
  AllExceptionsFilter,
  DatabaseExceptionFilter,
  HttpExceptionFilter,
} from '../src/common/filters/exception.filter.js';

describe('ApiEndpoint Module Lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let categoryId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const httpAdapterHost = app.get(HttpAdapterHost);

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(
      new AllExceptionsFilter(httpAdapterHost),
      new DatabaseExceptionFilter(httpAdapterHost),
      new HttpExceptionFilter(httpAdapterHost),
    );
    await app.init();

    // Clean up test records only (preserve seeded records id <= 29 and categories id <= 5)
    await ApiEndpoint.destroy({
      where: {
        [Op.or]: [
          { id: { [Op.gt]: 29 } },
          { endpointTag: { [Op.in]: ['users:list', 'users:create', 'accounts:list'] } },
          { endpointTag: { [Op.like]: '%users:list%' } },
          { endpointTag: { [Op.like]: '%users:create%' } },
          { endpointTag: { [Op.like]: '%accounts:list%' } },
        ],
      },
      force: true,
    });
    await ApiCategory.destroy({
      where: {
        [Op.or]: [
          { id: { [Op.gt]: 5 } },
          { categoryTag: 'endpoint_cat' },
        ],
      },
      force: true,
    });

    // Create a parent category for testing endpoints
    const category = await ApiCategory.create({
      categoryName: 'TEST_ENDPOINT_CATEGORY',
      categoryTag: 'endpoint_cat',
      bitIndex: 998,
      status: RecordStatus.ACTIVE,
    });
    categoryId = category.id;
  });

  afterAll(async () => {
    await ApiEndpoint.destroy({
      where: {
        [Op.or]: [
          { id: { [Op.gt]: 29 } },
          { endpointTag: { [Op.in]: ['users:list', 'users:create', 'accounts:list'] } },
          { endpointTag: { [Op.like]: '%users:list%' } },
          { endpointTag: { [Op.like]: '%users:create%' } },
          { endpointTag: { [Op.like]: '%accounts:list%' } },
        ],
      },
      force: true,
    });
    await ApiCategory.destroy({
      where: {
        [Op.or]: [
          { id: { [Op.gt]: 5 } },
          { categoryTag: 'endpoint_cat' },
        ],
      },
      force: true,
    });
    await app.close();
  });

  let createdEndpointId: number;
  let firstEndpointBitIndex: number;

  it('1. should create a new API endpoint (POST /apiEndpoints/createApiEndpoint)', async () => {
    const res = await request(app.getHttpServer())
      .post('/apiEndpoints/createApiEndpoint')
      .send({
        apiCategoryId: categoryId,
        apiEndpoint: '/api/v1/users',
        httpMethod: 'GET',
        endpointTag: 'users:list',
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.apiCategoryId).toBe(categoryId);
    expect(res.body.data.apiEndpoint).toBe('/api/v1/users');
    expect(res.body.data.httpMethod).toBe('GET');
    expect(res.body.data.endpointTag).toBe('users:list');
    expect(res.body.data.bitIndex).toBeTypeOf('number');
    firstEndpointBitIndex = res.body.data.bitIndex;
    expect(res.body.data.status).toBe(RecordStatus.ACTIVE);
    createdEndpointId = res.body.data.id;
  });

  it('2. should reject creating an endpoint with invalid parent category ID', async () => {
    await request(app.getHttpServer())
      .post('/apiEndpoints/createApiEndpoint')
      .send({
        apiCategoryId: 999999,
        apiEndpoint: '/api/v1/orphan',
        httpMethod: 'GET',
        endpointTag: 'orphan:get',
      })
      .expect(400);
  });

  it('3. should allocate sequential bitIndex for next endpoint', async () => {
    const res = await request(app.getHttpServer())
      .post('/apiEndpoints/createApiEndpoint')
      .send({
        apiCategoryId: categoryId,
        apiEndpoint: '/api/v1/users',
        httpMethod: 'POST',
        endpointTag: 'users:create',
      })
      .expect(201);

    expect(res.body.data.bitIndex).toBe(firstEndpointBitIndex + 1);
  });

  it('4. should reject duplicate endpoint tag with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/apiEndpoints/createApiEndpoint')
      .send({
        apiCategoryId: categoryId,
        apiEndpoint: '/api/v1/other',
        httpMethod: 'GET',
        endpointTag: 'users:list',
      })
      .expect(409);
  });

  it('5. should reject duplicate route (path + method) with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/apiEndpoints/createApiEndpoint')
      .send({
        apiCategoryId: categoryId,
        apiEndpoint: '/api/v1/users',
        httpMethod: 'GET',
        endpointTag: 'users:different_tag',
      })
      .expect(409);
  });

  it('6. should update endpoint details (PATCH /apiEndpoints/updateApiEndpoint/:id)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/apiEndpoints/updateApiEndpoint/${createdEndpointId}`)
      .send({
        apiEndpoint: '/api/v1/accounts',
        endpointTag: 'accounts:list',
        status: RecordStatus.INACTIVE,
      })
      .expect(200);

    expect(res.body.data.apiEndpoint).toBe('/api/v1/accounts');
    expect(res.body.data.endpointTag).toBe('accounts:list');
    expect(res.body.data.status).toBe(RecordStatus.INACTIVE);

    // Reactivate
    const reactivateRes = await request(app.getHttpServer())
      .patch(`/apiEndpoints/updateApiEndpoint/${createdEndpointId}`)
      .send({ status: RecordStatus.ACTIVE })
      .expect(200);

    expect(reactivateRes.body.data.status).toBe(RecordStatus.ACTIVE);
  });

  it('7. should soft-delete endpoint and release tag (DELETE /apiEndpoints/deleteApiEndpoint/:id)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/apiEndpoints/deleteApiEndpoint/${createdEndpointId}`)
      .expect(200);

    expect(res.body.data.success).toBe(true);

    const record = await ApiEndpoint.findByPk(createdEndpointId);
    expect(record).not.toBeNull();
    expect(record!.status).toBe(RecordStatus.DELETED);
    expect(record!.endpointTag).toContain('__deleted_');
  });

  it('8. should return 404 when attempting to delete already soft-deleted endpoint', async () => {
    await request(app.getHttpServer())
      .delete(`/apiEndpoints/deleteApiEndpoint/${createdEndpointId}`)
      .expect(404);
  });

  it('9. should reject updating soft-deleted endpoint', async () => {
    await request(app.getHttpServer())
      .patch(`/apiEndpoints/updateApiEndpoint/${createdEndpointId}`)
      .send({ status: RecordStatus.ACTIVE })
      .expect(400);
  });

  it('10. should successfully re-create endpoint with released tag', async () => {
    const res = await request(app.getHttpServer())
      .post('/apiEndpoints/createApiEndpoint')
      .send({
        apiCategoryId: categoryId,
        apiEndpoint: '/api/v1/accounts',
        httpMethod: 'GET',
        endpointTag: 'accounts:list',
      })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.id).not.toBe(createdEndpointId);
    expect(res.body.data.endpointTag).toBe('accounts:list');
    expect(res.body.data.bitIndex).toBe(firstEndpointBitIndex + 2);
  });

  it('11. should list endpoints with category details and pagination (GET /apiEndpoints/listApiEndpoint)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/apiEndpoints/listApiEndpoint?apiCategoryId=${categoryId}`)
      .expect(200);

    expect(res.body.data.count).toBe(2);
    expect(res.body.data.rows.length).toBe(2);
    expect(res.body.data.rows[0].apiCategory).toBeDefined();
    expect(res.body.data.rows[0].apiCategory.categoryName).toBe('TEST_ENDPOINT_CATEGORY');
  });

  it('12. should reject deleting parent category when active endpoints exist (DELETE /apiCategories/deleteApiCategory/:id)', async () => {
    await request(app.getHttpServer())
      .delete(`/apiCategories/deleteApiCategory/${categoryId}`)
      .expect(409);
  });

  it('13. should reject updating endpoint with empty string path', async () => {
    await request(app.getHttpServer())
      .patch(`/apiEndpoints/updateApiEndpoint/${createdEndpointId}`)
      .send({ apiEndpoint: '' })
      .expect(400);
  });
});
