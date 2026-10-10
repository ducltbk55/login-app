import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rmSync } from 'node:fs';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { createValidationPipe } from './../src/common/validation';
import { testDatabaseConfig } from './../src/database/testing';
import { todayInVietnam } from './../src/recruitment/recruitment.entity';

const API_KEY = 'test-api-key';

type Page<T> = { total: number; items: T[] };
type Item = { id: number };
type EventRow = { type: string; fromValue: string; toValue: string };

/** supertest trả `body: any` — gán kiểu một chỗ cho lint khỏi kêu. */
const bodyOf = <T>(res: { body: unknown }) => res.body as T;
const PDF = Buffer.from('%PDF-1.4\n%test cv\n', 'latin1');

/** Ngày lệch `days` so với hôm nay (giờ VN), dạng YYYY-MM-DD. */
function shiftDay(days: number): string {
  const date = new Date(`${todayInVietnam()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

describe('Recruitment (e2e)', () => {
  let app: INestApplication<App>;
  let config: Record<string, string>;

  const http = () => request(app.getHttpServer());
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

  const createBatch = async (overrides: Record<string, unknown> = {}) =>
    (
      await http()
        .post('/api/recruitment/batches')
        .set(auth())
        .send({
          name: 'Đợt quý IV',
          startDate: shiftDay(-1),
          endDate: shiftDay(10),
          status: 'open',
          ...overrides,
        })
        .expect(201)
    ).body as { id: number; accepting: boolean };

  const createJob = async (
    batchId: number,
    overrides: Record<string, unknown> = {},
  ) =>
    (
      await http()
        .post('/api/recruitment/jobs')
        .set(auth())
        .send({
          batchId,
          title: 'Lập trình viên Backend',
          level: 'Middle',
          employmentType: 'Toàn thời gian',
          location: 'Đà Nẵng',
          openings: 2,
          requirements: '- 2 năm NestJS\n\n• Hiểu MySQL',
          description: '<p>Mô tả</p><script>alert(1)</script>',
          ...overrides,
        })
        .expect(201)
    ).body as {
      id: number;
      slug: string;
      accepting: boolean;
      requirements: string[];
      description: string;
    };

  const firstCandidateId = async () =>
    bodyOf<Page<Item>>(
      await http().get('/api/recruitment/candidates').set(auth()),
    ).items[0].id;

  const apply = (jobId: number, email = 'ung.vien@example.com') =>
    http()
      .post('/api/recruitment/candidates')
      .set(auth())
      .field('jobId', String(jobId))
      .field('fullName', 'Trần Thị B')
      .field('email', email)
      .field('phone', '0905 123 456')
      .attach('cv', PDF, {
        filename: 'CV Trần Thị B.pdf',
        contentType: 'application/pdf',
      });

  it('tạo đợt + vị trí: lọc HTML, tách yêu cầu, sinh slug, đang nhận hồ sơ', async () => {
    const batch = await createBatch();
    expect(batch.accepting).toBe(true);

    const job = await createJob(batch.id);
    expect(job.slug).toBe('lap-trinh-vien-backend');
    expect(job.accepting).toBe(true);
    expect(job.requirements).toEqual(['2 năm NestJS', 'Hiểu MySQL']);
    expect(job.description).not.toContain('<script');

    // Trùng chức danh thì slug nối số.
    expect((await createJob(batch.id)).slug).toBe('lap-trinh-vien-backend-2');

    const open = await http()
      .get('/api/recruitment/jobs?accepting=true')
      .set(auth())
      .expect(200);
    expect(bodyOf<Page<Item>>(open).total).toBe(2);
  });

  it('đợt nháp, chưa tới ngày hoặc vị trí tạm dừng thì không nhận hồ sơ', async () => {
    const draft = await createBatch({ status: 'draft' });
    const future = await createBatch({
      startDate: shiftDay(3),
      endDate: shiftDay(9),
    });
    const open = await createBatch();

    const jobs = [
      await createJob(draft.id),
      await createJob(future.id),
      await createJob(open.id, { status: 'closed' }),
    ];
    for (const job of jobs) {
      expect(job.accepting).toBe(false);
      const res = await apply(job.id).expect(400);
      expect(bodyOf<{ message: string }>(res).message).toContain(
        'ngừng nhận hồ sơ',
      );
    }

    const list = await http()
      .get('/api/recruitment/jobs?accepting=true')
      .set(auth())
      .expect(200);
    expect(bodyOf<Page<Item>>(list).total).toBe(0);
  });

  it('ngày kết thúc trước ngày bắt đầu, hoặc ngày không có thật, bị từ chối', async () => {
    await http()
      .post('/api/recruitment/batches')
      .set(auth())
      .send({ name: 'X', startDate: '2026-10-10', endDate: '2026-10-01' })
      .expect(400);
    await http()
      .post('/api/recruitment/batches')
      .set(auth())
      .send({ name: 'X', startDate: '2026-02-31', endDate: '2026-03-10' })
      .expect(400);
  });

  it('nộp hồ sơ → hiện ở danh sách ứng viên, tải được CV, chặn nộp trùng', async () => {
    const batch = await createBatch();
    const job = await createJob(batch.id);

    await apply(job.id).expect(201);
    await apply(job.id).expect(409);

    const list = await http()
      .get(`/api/recruitment/candidates?batchId=${batch.id}`)
      .set(auth())
      .expect(200);
    const page = bodyOf<Page<Item>>(list);
    expect(page.total).toBe(1);
    const candidate = page.items[0];
    expect(candidate).toMatchObject({
      fullName: 'Trần Thị B',
      status: 'new',
      job: { id: job.id, title: 'Lập trình viên Backend' },
      batch: { id: batch.id },
      cv: { name: 'CV Trần Thị B.pdf', inline: true },
    });

    const cv = await http()
      .get(`/api/recruitment/candidates/${candidate.id}/cv`)
      .set(auth())
      .expect(200);
    expect(cv.headers['content-type']).toBe('application/pdf');
    expect(cv.headers['x-content-type-options']).toBe('nosniff');

    const stats = await http()
      .get('/api/recruitment/candidates/stats')
      .set(auth())
      .expect(200);
    expect(stats.body).toEqual({
      total: 1,
      pending: 1,
      interview: 0,
      hired: 0,
    });
  });

  it('CV giả (HTML đổi tên .pdf) hoặc sai định dạng bị từ chối', async () => {
    const job = await createJob((await createBatch()).id);

    await http()
      .post('/api/recruitment/candidates')
      .set(auth())
      .field('jobId', String(job.id))
      .field('fullName', 'A')
      .field('email', 'a@example.com')
      .field('phone', '0905123456')
      .attach('cv', Buffer.from('<html><script>x</script></html>'), {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);

    await http()
      .post('/api/recruitment/candidates')
      .set(auth())
      .field('jobId', String(job.id))
      .field('fullName', 'A')
      .field('email', 'a@example.com')
      .field('phone', '0905123456')
      .attach('cv', Buffer.from('hello'), {
        filename: 'cv.txt',
        contentType: 'text/plain',
      })
      .expect(400);

    // Thiếu CV.
    await http()
      .post('/api/recruitment/candidates')
      .set(auth())
      .field('jobId', String(job.id))
      .field('fullName', 'A')
      .field('email', 'a@example.com')
      .field('phone', '0905123456')
      .expect(400);
  });

  it('chuyển bước + hẹn phỏng vấn được ghi vào nhật ký', async () => {
    const job = await createJob((await createBatch()).id);
    await apply(job.id).expect(201);
    const id = await firstCandidateId();

    const updated = await http()
      .patch(`/api/recruitment/candidates/${id}`)
      .set(auth())
      .send({
        status: 'interview',
        interviewAt: '2026-10-20T07:30:00.000Z',
        handledBy: 'hr@example.com',
      })
      .expect(200);

    expect(updated.body).toMatchObject({
      status: 'interview',
      interviewAt: '2026-10-20T07:30:00.000Z',
      handledBy: 'hr@example.com',
    });
    // Dòng email (thư xác nhận) ghi bất đồng bộ — kiểm tra riêng ở test email.
    const types = bodyOf<{ events: EventRow[] }>(updated)
      .events.map((event) => event.type)
      .filter((type) => type !== 'email');
    expect(types.sort()).toEqual(['created', 'interview', 'status']);
  });

  /** Email gửi sau khi commit, không chờ — đợi nhật ký có dòng email. */
  const emailEvents = async (id: number, expected: number) => {
    for (let i = 0; i < 50; i += 1) {
      const res = await http()
        .get(`/api/recruitment/candidates/${id}`)
        .set(auth());
      const events = bodyOf<{ events: EventRow[] }>(res).events.filter(
        (event) => event.type === 'email',
      );
      if (events.length >= expected) return events;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Không thấy sự kiện email trong nhật ký');
  };

  it('email: nộp hồ sơ tự gửi thư xác nhận, đổi bước chỉ gửi khi notify', async () => {
    const job = await createJob((await createBatch()).id);
    await apply(job.id).expect(201);
    const id = await firstCandidateId();

    // Test không cấu hình SMTP → kết quả "off", nhưng vẫn có dấu vết.
    expect(await emailEvents(id, 1)).toEqual([
      expect.objectContaining({ toValue: 'received', fromValue: 'off' }),
    ]);

    // Không notify: đổi bước nhưng không có email nào thêm.
    await http()
      .patch(`/api/recruitment/candidates/${id}`)
      .set(auth())
      .send({ status: 'screening' })
      .expect(200);

    // Có notify: email mời phỏng vấn.
    await http()
      .patch(`/api/recruitment/candidates/${id}`)
      .set(auth())
      .send({
        status: 'interview',
        interviewAt: '2026-10-20T07:30:00.000Z',
        notify: true,
        message: 'Phòng họp 7A',
      })
      .expect(200);

    // Giữ bước Phỏng vấn, đổi lịch + notify: thư cập nhật lịch.
    await http()
      .patch(`/api/recruitment/candidates/${id}`)
      .set(auth())
      .send({ interviewAt: '2026-10-21T07:30:00.000Z', notify: true })
      .expect(200);

    const events = await emailEvents(id, 3);
    expect(events.map((event) => event.toValue).sort()).toEqual([
      'interview',
      'interview',
      'received',
    ]);
  });

  it('không xoá được vị trí đã có hồ sơ, hay đợt còn vị trí', async () => {
    const batch = await createBatch();
    const job = await createJob(batch.id);
    await apply(job.id).expect(201);

    await http()
      .delete(`/api/recruitment/jobs/${job.id}`)
      .set(auth())
      .expect(409);
    await http()
      .delete(`/api/recruitment/batches/${batch.id}`)
      .set(auth())
      .expect(409);

    // Xoá hồ sơ → xoá được vị trí → xoá được đợt.
    const id = await firstCandidateId();
    await http()
      .delete(`/api/recruitment/candidates/${id}`)
      .set(auth())
      .expect(204);
    await http()
      .delete(`/api/recruitment/jobs/${job.id}`)
      .set(auth())
      .expect(204);
    await http()
      .delete(`/api/recruitment/batches/${batch.id}`)
      .set(auth())
      .expect(204);
  });
});
