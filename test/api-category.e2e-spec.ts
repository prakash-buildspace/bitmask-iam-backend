import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { expect, describe, beforeAll, afterAll, it } from 'vitest';
import { Op } from 'sequelize';
import { AppModule } from '../src/app.module.js';
import { ApiCategory } from '../src/modules/ApiCategory/entities/ApiCategory.entity.js';
import { RecordStatus } from '../src/common/constants/status.constant.js';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js';
import {
  AllExceptionsFilter,
  DatabaseExceptionFilter,
  HttpExceptionFilter,
} from '../src/common/filters/exception.filter.js';

describe('ApiCategory Module Lifecycle (e2e)', () => {
  let app: INestApplication<App>;

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

    // Clean up test records only (preserve seeded records with id <= 5)
    await ApiCategory.destroy({
      where: {
        [Op.or]: [
          { id: { [Op.gt]: 5 } },
          { categoryTag: { [Op.in]: ['auth', 'users', 'auth_v1'] } },
          { categoryName: { [Op.like]: '%AUTH_MANAGEMENT%' } },
          { categoryName: { [Op.like]: '%USER_MANAGEMENT%' } },
          { categoryName: { [Op.like]: '%AUTHENTICATION_SERVICES%' } },
        ],
      },
      force: true,
    });
  });

  afterAll(async () => {
    await ApiCategory.destroy({
      where: {
        [Op.or]: [
          { id: { [Op.gt]: 5 } },
          { categoryTag: { [Op.in]: ['auth', 'users', 'auth_v1'] } },
          { categoryName: { [Op.like]: '%AUTH_MANAGEMENT%' } },
          { categoryName: { [Op.like]: '%USER_MANAGEMENT%' } },
          { categoryName: { [Op.like]: '%AUTHENTICATION_SERVICES%' } },
        ],
      },
      force: true,
    });
    await app.close();
  });

  let createdId: number;
  let firstBitIndex: number;

  it('1. should create a new API category (POST /apiCategories/createApiCategory)', async () => {
    const res = await request(app.getHttpServer())
      .post('/apiCategories/createApiCategory')
      .send({ categoryName: 'AUTH_MANAGEMENT', categoryTag: 'auth' })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.categoryName).toBe('AUTH_MANAGEMENT');
    expect(res.body.data.categoryTag).toBe('auth');
    expect(res.body.data.bitIndex).toBeTypeOf('number');
    firstBitIndex = res.body.data.bitIndex;
    expect(res.body.data.status).toBe(RecordStatus.ACTIVE);
    createdId = res.body.data.id;
  });

  it('2. should allocate sequential bitIndex for next category', async () => {
    const res = await request(app.getHttpServer())
      .post('/apiCategories/createApiCategory')
      .send({ categoryName: 'USER_MANAGEMENT', categoryTag: 'users' })
      .expect(201);

    expect(res.body.data.bitIndex).toBe(firstBitIndex + 1);
  });

  it('3. should reject duplicate category name with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/apiCategories/createApiCategory')
      .send({ categoryName: 'AUTH_MANAGEMENT', categoryTag: 'auth_alt' })
      .expect(409);
  });

  it('4. should reject duplicate category tag with 409 Conflict', async () => {
    await request(app.getHttpServer())
      .post('/apiCategories/createApiCategory')
      .send({ categoryName: 'OTHER_NAME', categoryTag: 'auth' })
      .expect(409);
  });

  it('5. should update category name, tag, and status (PATCH /apiCategories/updateApiCategory/:id)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/apiCategories/updateApiCategory/${createdId}`)
      .send({
        categoryName: 'AUTHENTICATION_SERVICES',
        categoryTag: 'auth_v1',
        status: RecordStatus.INACTIVE,
      })
      .expect(200);

    expect(res.body.data.categoryName).toBe('AUTHENTICATION_SERVICES');
    expect(res.body.data.categoryTag).toBe('auth_v1');
    expect(res.body.data.status).toBe(RecordStatus.INACTIVE);

    // Reactivate
    const reactivateRes = await request(app.getHttpServer())
      .patch(`/apiCategories/updateApiCategory/${createdId}`)
      .send({ status: RecordStatus.ACTIVE })
      .expect(200);

    expect(reactivateRes.body.data.status).toBe(RecordStatus.ACTIVE);
  });

  it('6. should soft-delete category and release name/tag (DELETE /apiCategories/deleteApiCategory/:id)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/apiCategories/deleteApiCategory/${createdId}`)
      .expect(200);

    expect(res.body.data.success).toBe(true);

    const record = await ApiCategory.findByPk(createdId);
    expect(record).not.toBeNull();
    expect(record!.status).toBe(RecordStatus.DELETED);
    expect(record!.categoryName).toContain('__deleted_');
    expect(record!.categoryTag).toContain('__deleted_');
  });

  it('7. should return 404 when attempting to delete already soft-deleted category', async () => {
    await request(app.getHttpServer())
      .delete(`/apiCategories/deleteApiCategory/${createdId}`)
      .expect(404);
  });

  it('8. should reject updating soft-deleted category', async () => {
    await request(app.getHttpServer())
      .patch(`/apiCategories/updateApiCategory/${createdId}`)
      .send({ status: RecordStatus.ACTIVE })
      .expect(400);
  });

  it('9. should successfully re-create category with the released name and tag', async () => {
    const res = await request(app.getHttpServer())
      .post('/apiCategories/createApiCategory')
      .send({ categoryName: 'AUTHENTICATION_SERVICES', categoryTag: 'auth_v1' })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.id).not.toBe(createdId);
    expect(res.body.data.categoryName).toBe('AUTHENTICATION_SERVICES');
    expect(res.body.data.categoryTag).toBe('auth_v1');
    expect(res.body.data.status).toBe(RecordStatus.ACTIVE);
    expect(res.body.data.bitIndex).toBe(firstBitIndex + 2);
  });

  it('10. should list categories and filter by tag (GET /apiCategories/listApiCategory)', async () => {
    const res = await request(app.getHttpServer())
      .get('/apiCategories/listApiCategory?categoryTag=auth_v1')
      .expect(200);

    expect(res.body.data.count).toBe(1);
    expect(res.body.data.rows.length).toBe(1);
    expect(res.body.data.rows[0].categoryName).toBe('AUTHENTICATION_SERVICES');
  });
});
