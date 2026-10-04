import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rmSync } from 'node:fs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { createValidationPipe } from './../src/common/validation';
import { MAX_ATTACHMENT_BYTES } from './../src/contacts/attachments';
import { testDatabaseConfig } from './../src/database/testing';

const API_KEY = 'test-api-key';

describe('Contacts (e2e)', () => {
  let app: INestApplication<App>;
  let config: Record<string, string>;

  const auth = () => ({ 'x-api-key': API_KEY });

  beforeEach(async () => {
    config = testDatabaseConfig();
    Object.assign(process.env, config);
    process.env.BACKEND_API_KEY = API_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    rmSync(config.UPLOAD_DIR, { recursive: true, force: true });
    for (const key of Object.keys(config)) delete process.env[key];
    delete process.env.BACKEND_API_KEY;
  });

  /** Gửi form như trình duyệt gửi: multipart, mọi trường là chuỗi. */
  const send = () =>
    request(app.getHttpServer())
      .post('/api/contacts')
      .set(auth())
      .field('name', 'Nguyễn Văn A')
      .field('email', 'a@example.com')
      .field('message', 'Tôi cần tư vấn.');

  const firstId = async (): Promise<number> => {
    const list = await request(app.getHttpServer())
      .get('/api/contacts')
      .set(auth())
      .expect(200);
    return (list.body as { items: { id: number }[] }).items[0].id;
  };

  it('thiếu api key thì 401', async () => {
    await request(app.getHttpServer()).get('/api/contacts').expect(401);
  });

  it('gửi được form không kèm tệp', async () => {
    await send().expect(201).expect({ ok: true });

    const list = await request(app.getHttpServer())
      .get('/api/contacts')
      .set(auth())
      .expect(200);

    expect((list.body as { total: number }).total).toBe(1);
    expect((list.body as { items: unknown[] }).items[0]).toMatchObject({
      name: 'Nguyễn Văn A',
      status: 'new',
      attachment: null,
    });
  });

  it('thiếu trường bắt buộc báo đúng một lỗi tiếng Việt mỗi trường', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/contacts')
      .set(auth())
      .field('name', '')
      .expect(400);

    expect((response.body as { message: string[] }).message).toEqual([
      'Họ tên không được để trống',
      'Email không hợp lệ',
      'Nội dung không được để trống',
    ]);
  });

  it('email sai định dạng bị từ chối', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/contacts')
      .set(auth())
      .field('name', 'A')
      .field('email', 'khong-phai-email')
      .field('message', 'Xin chào')
      .expect(400);

    expect((response.body as { message: string[] }).message).toEqual([
      'Email không hợp lệ',
    ]);
  });

  describe('tệp đính kèm', () => {
    it('nhận PDF và trả lại đúng nội dung, mở xem thẳng được', async () => {
      await send()
        .attach('attachment', Buffer.from('%PDF-1.4 xin chao'), {
          filename: 'bao-cao.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      const id = await firstId();
      const detail = await request(app.getHttpServer())
        .get(`/api/contacts/${id}`)
        .set(auth())
        .expect(200);

      expect((detail.body as { attachment: unknown }).attachment).toMatchObject(
        { name: 'bao-cao.pdf', mime: 'application/pdf', inline: true },
      );

      const file = await request(app.getHttpServer())
        .get(`/api/contacts/${id}/attachment`)
        .set(auth())
        .expect(200);

      expect(file.headers['content-type']).toContain('application/pdf');
      expect(file.headers['content-disposition']).toContain('inline');
      expect(file.headers['x-content-type-options']).toBe('nosniff');
      // supertest tra body nhi phan dang Buffer nhung kieu la `any`.
      expect((file.body as Buffer).toString()).toBe('%PDF-1.4 xin chao');
    });

    /**
     * SVG chạy được script khi mở trực tiếp — phải chặn ngay từ cổng vào,
     * không để nó nằm trên đĩa rồi mới nghĩ cách phục vụ an toàn.
     */
    it('từ chối SVG', async () => {
      await send()
        .attach('attachment', Buffer.from('<svg onload="alert(1)"></svg>'), {
          filename: 'x.svg',
          contentType: 'image/svg+xml',
        })
        .expect(400);
    });

    it('từ chối tệp thực thi', async () => {
      await send()
        .attach('attachment', Buffer.from('MZ'), {
          filename: 'virus.exe',
          contentType: 'application/x-msdownload',
        })
        .expect(400);
    });

    it('từ chối tệp quá dung lượng', async () => {
      await send()
        .attach('attachment', Buffer.alloc(MAX_ATTACHMENT_BYTES + 1024), {
          filename: 'to-qua.pdf',
          contentType: 'application/pdf',
        })
        .expect(413);
    });

    it('tệp bị từ chối thì không có bản ghi nào được tạo', async () => {
      await send()
        .attach('attachment', Buffer.from('MZ'), {
          filename: 'virus.exe',
          contentType: 'application/x-msdownload',
        })
        .expect(400);

      const list = await request(app.getHttpServer())
        .get('/api/contacts')
        .set(auth())
        .expect(200);

      expect((list.body as { total: number }).total).toBe(0);
    });

    it('zip buộc tải về chứ không mở trong trang', async () => {
      await send()
        .attach('attachment', Buffer.from('PK'), {
          filename: 'tai-lieu.zip',
          contentType: 'application/zip',
        })
        .expect(201);

      const file = await request(app.getHttpServer())
        .get(`/api/contacts/${await firstId()}/attachment`)
        .set(auth())
        .expect(200);

      expect(file.headers['content-disposition']).toContain('attachment');
    });

    it('tên tệp tiếng Việt giữ được dấu qua Content-Disposition', async () => {
      await send()
        .attach('attachment', Buffer.from('%PDF-1.4'), {
          filename: 'Báo cáo quý 1.pdf',
          contentType: 'application/pdf',
        })
        .expect(201);

      const file = await request(app.getHttpServer())
        .get(`/api/contacts/${await firstId()}/attachment`)
        .set(auth())
        .expect(200);

      // Dạng ASCII dự phòng cho trình duyệt cũ, kèm dạng UTF-8 đầy đủ.
      expect(file.headers['content-disposition']).toContain(
        "filename*=UTF-8''",
      );
      expect(
        decodeURIComponent(
          /filename\*=UTF-8''([^;]+)/.exec(
            file.headers['content-disposition'],
          )![1],
        ),
      ).toBe('Báo cáo quý 1.pdf');
    });

    it('đòi tệp của liên hệ không có tệp thì 404', async () => {
      await send().expect(201);

      await request(app.getHttpServer())
        .get(`/api/contacts/${await firstId()}/attachment`)
        .set(auth())
        .expect(404);
    });
  });

  describe('xử lý', () => {
    it('đổi trạng thái và ghi chú', async () => {
      await send().expect(201);
      const id = await firstId();

      const updated = await request(app.getHttpServer())
        .patch(`/api/contacts/${id}`)
        .set(auth())
        .send({
          status: 'resolved',
          note: 'Đã gọi lại',
          handledBy: 'admin@uyvu.vn',
        })
        .expect(200);

      expect(updated.body).toMatchObject({
        status: 'resolved',
        note: 'Đã gọi lại',
        handledBy: 'admin@uyvu.vn',
      });
      expect((updated.body as { handledAt: string }).handledAt).not.toBeNull();
    });

    it('trạng thái lạ bị từ chối', async () => {
      await send().expect(201);

      await request(app.getHttpServer())
        .patch(`/api/contacts/${await firstId()}`)
        .set(auth())
        .send({ status: 'xong-roi' })
        .expect(400);
    });

    it('không sửa được nội dung người gửi viết', async () => {
      await send().expect(201);

      await request(app.getHttpServer())
        .patch(`/api/contacts/${await firstId()}`)
        .set(auth())
        .send({ message: 'bị sửa' })
        .expect(400);
    });

    it('thống kê theo trạng thái', async () => {
      await send().expect(201);
      await send().expect(201);
      await request(app.getHttpServer())
        .patch(`/api/contacts/${await firstId()}`)
        .set(auth())
        .send({ status: 'in_progress' })
        .expect(200);

      const stats = await request(app.getHttpServer())
        .get('/api/contacts/stats')
        .set(auth())
        .expect(200);

      expect(stats.body).toEqual({
        total: 2,
        pending: 1,
        inProgress: 1,
        resolved: 0,
      });
    });

    it('xoá liên hệ', async () => {
      await send().expect(201);
      const id = await firstId();

      await request(app.getHttpServer())
        .delete(`/api/contacts/${id}`)
        .set(auth())
        .expect(204);
      await request(app.getHttpServer())
        .get(`/api/contacts/${id}`)
        .set(auth())
        .expect(404);
    });
  });
});
