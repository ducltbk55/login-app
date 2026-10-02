import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

const API_KEY = 'test-api-key';

type SyncResponse = {
  isNewUser: boolean;
  user: { email: string; loginCount: number };
};

type ListResponse = { total: number };

describe('API (e2e)', () => {
  const sync = (email: string) =>
    request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email, provider: 'google' })
      .expect(200);

  let app: INestApplication<App>;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-e2e-'));
    process.env.DATABASE_FILE = path.join(tempDir, 'e2e.db');
    process.env.BACKEND_API_KEY = API_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DATABASE_FILE;
    delete process.env.BACKEND_API_KEY;
  });

  it('GET /api/health không cần api key', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(response.body).toMatchObject({ status: 'ok', users: 0 });
  });

  it('POST /api/users/sync bị chặn khi thiếu api key', async () => {
    await request(app.getHttpServer())
      .post('/api/users/sync')
      .send({ email: 'an@example.com', provider: 'google' })
      .expect(401);
  });

  it('POST /api/users/sync đăng ký rồi ghi nhận đăng nhập', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'an@example.com', name: 'An', provider: 'google' })
      .expect(200);
    expect(first.body).toMatchObject({ isNewUser: true });

    const second = await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'an@example.com', name: 'An', provider: 'google' })
      .expect(200);
    expect(second.body as SyncResponse).toMatchObject({
      isNewUser: false,
      user: { loginCount: 2, email: 'an@example.com' },
    });

    const list = await request(app.getHttpServer())
      .get('/api/users')
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(list.body as ListResponse).toMatchObject({ total: 1 });
  });

  it('từ chối payload không hợp lệ', async () => {
    await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'khong-phai-email', provider: 'facebook' })
      .expect(400);
  });

  it('GET /api/users/stats đếm theo vai trò và trạng thái', async () => {
    await sync('an@example.com');
    await request(app.getHttpServer())
      .patch('/api/users/an@example.com')
      .set('x-api-key', API_KEY)
      .send({ role: 'admin' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/users/stats')
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(response.body).toMatchObject({ total: 1, admins: 1, blocked: 0 });
  });

  it('PUT /api/users/:email/groups gán nhóm quyền', async () => {
    await sync('an@example.com');
    const group = await request(app.getHttpServer())
      .post('/api/permission-groups')
      .set('x-api-key', API_KEY)
      .send({ name: 'Biên tập', permissions: ['categories.write'] })
      .expect(201);

    const groupId = (group.body as { id: string }).id;
    const updated = await request(app.getHttpServer())
      .put('/api/users/an@example.com/groups')
      .set('x-api-key', API_KEY)
      .send({ groupIds: [groupId] })
      .expect(200);

    expect(updated.body).toMatchObject({
      groups: [{ id: groupId, slug: 'bien-tap' }],
      permissions: ['categories.write'],
    });
  });

  it('tài khoản bị khoá thì POST /users/sync trả 403', async () => {
    await sync('an@example.com');
    await request(app.getHttpServer())
      .patch('/api/users/an@example.com')
      .set('x-api-key', API_KEY)
      .send({ status: 'blocked' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'an@example.com', provider: 'google' })
      .expect(403);
  });

  it('CRUD /api/categories', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Đồ gia dụng' })
      .expect(201);

    const id = (created.body as { id: string; slug: string }).id;
    expect(created.body).toMatchObject({ slug: 'do-gia-dung', isActive: true });

    const list = await request(app.getHttpServer())
      .get('/api/categories?search=gia dung')
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(list.body).toMatchObject({ total: 1 });

    const patched = await request(app.getHttpServer())
      .patch(`/api/categories/${id}`)
      .set('x-api-key', API_KEY)
      .send({ isActive: false, sortOrder: 3 })
      .expect(200);
    expect(patched.body).toMatchObject({ isActive: false, sortOrder: 3 });

    await request(app.getHttpServer())
      .delete(`/api/categories/${id}`)
      .set('x-api-key', API_KEY)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/categories/${id}`)
      .set('x-api-key', API_KEY)
      .expect(404);
  });

  it('từ chối category thiếu name hoặc slug sai định dạng', async () => {
    await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Hợp lệ', slug: 'Không Hợp Lệ' })
      .expect(400);
  });

  it('GET /api/permissions trả danh mục quyền cố định', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/permissions')
      .set('x-api-key', API_KEY)
      .expect(200);

    const items = (response.body as { items: { key: string }[] }).items;
    expect(items.map((i) => i.key)).toContain('categories.write');
  });

  it('từ chối permission không có trong danh mục', async () => {
    await request(app.getHttpServer())
      .post('/api/permission-groups')
      .set('x-api-key', API_KEY)
      .send({ name: 'Nhóm lạ', permissions: ['dashboard.hack'] })
      .expect(400);
  });

  it('mọi endpoint admin đều cần api key', async () => {
    await request(app.getHttpServer()).get('/api/categories').expect(401);
    await request(app.getHttpServer())
      .get('/api/permission-groups')
      .expect(401);
    await request(app.getHttpServer()).get('/api/users/stats').expect(401);
  });
});
