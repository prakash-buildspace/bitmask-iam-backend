import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';
import { expect, describe, beforeAll, afterAll, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PermissionSet } from '../src/modules/PermissionSet/entities/PermissionSet.entity.js';
import { RecordStatus } from '../src/common/constants/status.constant.js';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor.js';
import {
  AllExceptionsFilter,
  DatabaseExceptionFilter,
  HttpExceptionFilter,
} from '../src/common/filters/exception.filter.js';

describe('PermissionSet Module Lifecycle (e2e)', () => {
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

    // Clean up any test records
    await PermissionSet.destroy({
      where: {},
      force: true,
      truncate: true,
    });
  });

  afterAll(async () => {
    await PermissionSet.destroy({
      where: {},
      force: true,
      truncate: true,
    });
    await app.close();
  });

  let createdId: number;

  it('1. should create a new permission set', async () => {
    const res = await request(app.getHttpServer())
      .post('/permissionSets/createPermissionSet')
      .send({ name: 'TEST_FINANCE', description: 'Finance management' })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.permissionSetName).toBe('TEST_FINANCE');
    expect(res.body.data.status).toBe(RecordStatus.ACTIVE);
    createdId = res.body.data.id;
  });

  it('2. should reject duplicate active permission set name', async () => {
    await request(app.getHttpServer())
      .post('/permissionSets/createPermissionSet')
      .send({ name: 'TEST_FINANCE' })
      .expect(409);
  });

  it('3. should update permission set status to inactive (0)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/permissionSets/updatePermissionSet/${createdId}`)
      .send({ status: RecordStatus.INACTIVE })
      .expect(200);

    expect(res.body.data.status).toBe(RecordStatus.INACTIVE);
  });

  it('4. should re-activate inactive permission set (0 -> 1)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/permissionSets/updatePermissionSet/${createdId}`)
      .send({ status: RecordStatus.ACTIVE })
      .expect(200);

    expect(res.body.data.status).toBe(RecordStatus.ACTIVE);
  });

  it('5. should soft-delete permission set (sets status=2 and releases name)', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/permissionSets/deletePermissionSet/${createdId}`)
      .expect(200);

    expect(res.body.data.success).toBe(true);

    // Verify in DB directly: status is 2 and name was released with suffix
    const record = await PermissionSet.findByPk(createdId);
    expect(record).not.toBeNull();
    expect(record!.status).toBe(RecordStatus.DELETED);
    expect(record!.permissionSetName).toContain('TEST_FINANCE__deleted_');
  });

  it('6. should return 404 when attempting to delete an already deleted record', async () => {
    await request(app.getHttpServer())
      .delete(`/permissionSets/deletePermissionSet/${createdId}`)
      .expect(404);
  });

  it('7. should reject updating a soft-deleted record (cannot be recovered)', async () => {
    await request(app.getHttpServer())
      .patch(`/permissionSets/updatePermissionSet/${createdId}`)
      .send({ status: RecordStatus.ACTIVE })
      .expect(400);
  });

  it('8. should successfully re-create permission set with the SAME name', async () => {
    const res = await request(app.getHttpServer())
      .post('/permissionSets/createPermissionSet')
      .send({ name: 'TEST_FINANCE', description: 'Re-created finance management' })
      .expect(201);

    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.id).not.toBe(createdId);
    expect(res.body.data.permissionSetName).toBe('TEST_FINANCE');
    expect(res.body.data.status).toBe(RecordStatus.ACTIVE);
  });

  it('9. should exclude soft-deleted records from listPermissionSet by default', async () => {
    const res = await request(app.getHttpServer())
      .get('/permissionSets/listPermissionSet')
      .expect(200);

    expect(res.body.data.count).toBe(1);
    expect(res.body.data.rows.length).toBe(1);
    expect(res.body.data.rows[0].permissionSetName).toBe('TEST_FINANCE');
  });
});
