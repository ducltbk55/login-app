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
});
