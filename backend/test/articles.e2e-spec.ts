import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { createValidationPipe } from './../src/common/validation';

const API_KEY = 'test-api-key';

type Category = { id: number; code: string; name: string };

describe('Articles (e2e)', () => {
  let app: INestApplication<App>;
  let tempDir: string;
  let tinNoiBo: number;

  const auth = () => ({ 'x-api-key': API_KEY });

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-articles-e2e-'));
    process.env.DATABASE_FILE = path.join(tempDir, 'e2e.db');
    process.env.BACKEND_API_KEY = API_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createValidationPipe());
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/api/articles/categories')
      .set(auth())
      .expect(200);

    tinNoiBo = (response.body as Category[]).find(
      (c) => c.code === 'TIN_NOI_BO',
    )!.id;
  });

  afterEach(async () => {
    await app.close();
    rmSync(tempDir, { recursive: true, force: true });
    delete process.env.DATABASE_FILE;
    delete process.env.BACKEND_API_KEY;
  });

  const body = (extra: Record<string, unknown> = {}) => ({
    categoryDetailId: tinNoiBo,
    title: 'Bài viết thử',
    content: 'Nội dung thử nghiệm.',
    author: 'Biên tập viên',
    ...extra,
  });

  it('seed sẵn 4 chuyên mục', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/articles/categories')
      .set(auth())
      .expect(200);

    expect((response.body as Category[]).map((c) => c.code)).toEqual([
      'TIN_NOI_BO',
      'HOAT_DONG_KHACH_HANG',
      'TIN_CONG_NGHE',
      'CONG_NGHE_THE_GIOI',
    ]);
  });

  it('thiếu api key thì 401', async () => {
    await request(app.getHttpServer()).get('/api/articles').expect(401);
  });

  it('tạo rồi đọc lại được theo slug', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body({ title: 'Chuyển đổi số', status: 'published' }))
      .expect(201);

    expect(created.body).toMatchObject({
      slug: 'chuyen-doi-so',
      status: 'published',
      live: true,
    });

    const fetched = await request(app.getHttpServer())
      .get('/api/articles/slug/chuyen-doi-so')
      .set(auth())
      .expect(200);

    expect(fetched.body).toMatchObject({ title: 'Chuyển đổi số' });
  });

  /**
   * `/articles/slug/...` phải khớp trước `/articles/:id`, nếu khai báo sai thứ
   * tự thì ParseIntPipe nuốt mất và trả 400.
   */
  it('route slug không bị route :id nuốt mất', async () => {
    await request(app.getHttpServer())
      .get('/api/articles/slug/khong-co-that')
      .set(auth())
      .expect(404);
  });

  it('mỗi trường sai chỉ báo đúng một thông báo tiếng Việt', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send({})
      .expect(400);

    expect((response.body as { message: string[] }).message).toEqual([
      'Hãy chọn chuyên mục cho bài viết',
      'Tiêu đề không được để trống',
      'Nội dung không được để trống',
      'Tác giả không được để trống',
    ]);
  });

  it('tiêu đề quá dài báo đúng lỗi độ dài', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body({ title: 'a'.repeat(201) }))
      .expect(400);

    expect((response.body as { message: string[] }).message).toEqual([
      'Tiêu đề tối đa 200 ký tự',
    ]);
  });

  it('từ chối trường lạ', async () => {
    await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body({ viewCount: 9999 }))
      .expect(400);
  });

  it('bộ lọc live bỏ qua nháp và bài hẹn giờ', async () => {
    await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body({ title: 'Nháp' }))
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(
        body({
          title: 'Hẹn giờ',
          status: 'published',
          publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
        }),
      )
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body({ title: 'Đang đăng', status: 'published' }))
      .expect(201);

    const all = await request(app.getHttpServer())
      .get('/api/articles')
      .set(auth())
      .expect(200);
    const live = await request(app.getHttpServer())
      .get('/api/articles?live=true')
      .set(auth())
      .expect(200);

    expect((all.body as { total: number }).total).toBe(3);
    expect(
      (live.body as { items: { title: string }[] }).items.map((a) => a.title),
    ).toEqual(['Đang đăng']);
  });

  it('đếm lượt xem qua slug', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body({ status: 'published' }))
      .expect(201);

    const { slug } = created.body as { slug: string };
    await request(app.getHttpServer())
      .post(`/api/articles/slug/${slug}/views`)
      .set(auth())
      .expect(204);

    const after = await request(app.getHttpServer())
      .get(`/api/articles/slug/${slug}`)
      .set(auth())
      .expect(200);

    expect((after.body as { viewCount: number }).viewCount).toBe(1);
  });

  it('không xoá được chuyên mục đang có bài', async () => {
    const categories = await request(app.getHttpServer())
      .get('/api/categories?search=chuyen%20muc')
      .set(auth())
      .expect(200);
    const categoryId = (categories.body as { items: { id: number }[] }).items[0]
      .id;

    await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body())
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}/details/${tinNoiBo}`)
      .set(auth())
      .expect(409);

    expect((response.body as { message: string }).message).toMatch(
      /đang có 1 bài viết/,
    );
  });

  it('xoá bài viết', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/articles')
      .set(auth())
      .send(body())
      .expect(201);

    const { id } = created.body as { id: number };
    await request(app.getHttpServer())
      .delete(`/api/articles/${id}`)
      .set(auth())
      .expect(204);
    await request(app.getHttpServer())
      .get(`/api/articles/${id}`)
      .set(auth())
      .expect(404);
  });
});
