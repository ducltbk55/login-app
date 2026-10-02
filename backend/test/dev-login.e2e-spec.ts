import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

const API_KEY = 'test-api-key';

/**
 * Cổng DEV_LOGIN ở backend — lớp phòng thủ độc lập với frontend.
 *
 * `DEV_LOGIN` được đặt thẳng vào `process.env`: dotenv không ghi đè biến đã có
 * nên test không phụ thuộc vào `.env.local` của máy đang chạy.
 */
describe('Dev login (e2e)', () => {
  let app: INestApplication<App>;
  let tempDir: string;

  const boot = async (devLogin: string | undefined) => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-dev-login-'));
    process.env.DATABASE_FILE = path.join(tempDir, 'e2e.db');
    process.env.BACKEND_API_KEY = API_KEY;
    if (devLogin === undefined) delete process.env.DEV_LOGIN;
    else process.env.DEV_LOGIN = devLogin;

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
  };

  /** Tạo một tài khoản đã duyệt và trả về id của nó. */
  const seedUser = async (email: string): Promise<number> => {
    const created = await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email, name: 'Thử', provider: 'google', mode: 'register' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/users/${email}`)
      .set('x-api-key', API_KEY)
      .send({ status: 'active' })
      .expect(200);

    return (created.body as { user: { id: number } }).user.id;
  };

  afterEach(async () => {
    await app.close();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DATABASE_FILE;
    delete process.env.BACKEND_API_KEY;
    delete process.env.DEV_LOGIN;
  });

  describe('khi không cấu hình DEV_LOGIN (mặc định)', () => {
    beforeEach(() => boot(undefined));

    it('chặn danh sách tài khoản dù có khoá nội bộ hợp lệ', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/dev-login/users')
        .set('x-api-key', API_KEY)
        .expect(403);

      expect((response.body as { message: string }).message).toMatch(
        /DEV_LOGIN=on/,
      );
    });

    it('chặn tra cứu theo id', async () => {
      const id = await seedUser('an@example.com');

      await request(app.getHttpServer())
        .get(`/api/dev-login/users/${id}`)
        .set('x-api-key', API_KEY)
        .expect(403);
    });

    it('thiếu khoá nội bộ thì dừng ở 401, chưa tới cổng DEV_LOGIN', async () => {
      await request(app.getHttpServer())
        .get('/api/dev-login/users')
        .expect(401);
    });

    it('API thường vẫn chạy bình thường', async () => {
      await seedUser('binh@example.com');

      await request(app.getHttpServer())
        .get('/api/users')
        .set('x-api-key', API_KEY)
        .expect(200);
    });
  });

  describe('khi DEV_LOGIN=off', () => {
    beforeEach(() => boot('off'));

    it('vẫn chặn', async () => {
      await request(app.getHttpServer())
        .get('/api/dev-login/users')
        .set('x-api-key', API_KEY)
        .expect(403);
    });
  });

  describe('khi DEV_LOGIN=on', () => {
    beforeEach(() => boot('on'));

    it('trả danh sách tài khoản', async () => {
      await seedUser('cuong@example.com');

      const response = await request(app.getHttpServer())
        .get('/api/dev-login/users')
        .set('x-api-key', API_KEY)
        .expect(200);

      const body = response.body as { total: number; items: { id: number }[] };
      expect(body.total).toBe(1);
      expect(body.items[0].id).toBeGreaterThan(0);
    });

    it('tra được tài khoản theo id', async () => {
      const id = await seedUser('dung@example.com');

      const response = await request(app.getHttpServer())
        .get(`/api/dev-login/users/${id}`)
        .set('x-api-key', API_KEY)
        .expect(200);

      expect(response.body).toMatchObject({ id, email: 'dung@example.com' });
    });

    it('id không có thật trả 404', async () => {
      await request(app.getHttpServer())
        .get('/api/dev-login/users/9999')
        .set('x-api-key', API_KEY)
        .expect(404);
    });

    it('id không phải số trả 400', async () => {
      await request(app.getHttpServer())
        .get('/api/dev-login/users/abc')
        .set('x-api-key', API_KEY)
        .expect(400);
    });

    it('tra được cả tài khoản đang chờ duyệt — đó là mục đích của công cụ', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/users/sync')
        .set('x-api-key', API_KEY)
        .send({
          email: 'cho@example.com',
          provider: 'google',
          mode: 'register',
        })
        .expect(200);
      const { id } = (created.body as { user: { id: number } }).user;

      const response = await request(app.getHttpServer())
        .get(`/api/dev-login/users/${id}`)
        .set('x-api-key', API_KEY)
        .expect(200);

      expect(response.body).toMatchObject({ status: 'inactive' });
    });
  });
});
