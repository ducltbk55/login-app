import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { rmSync } from 'node:fs';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { createValidationPipe } from './../src/common/validation';
import { testDatabaseConfig } from '../src/database/testing';

const API_KEY = 'test-api-key';

type SyncResponse = {
  isNewUser: boolean;
  user: { email: string; loginCount: number };
};

type ListResponse = { total: number };

describe('API (e2e)', () => {
  const register = (email: string) =>
    request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email, provider: 'google', mode: 'register' })
      .expect(200);

  const login = (email: string) =>
    request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email, provider: 'google', mode: 'login' })
      .expect(200);

  /** Đăng ký rồi duyệt — tài khoản dùng được ngay. */
  const approve = (email: string) =>
    request(app.getHttpServer())
      .patch(`/api/users/${email}`)
      .set('x-api-key', API_KEY)
      .send({ status: 'active' })
      .expect(200);

  const registerApproved = async (email: string) => {
    await register(email);
    await approve(email);
  };

  let app: INestApplication<App>;
  let dbEnv: Record<string, string>;

  beforeEach(async () => {
    // Database MySQL riêng cho từng test, tự xoá khi app đóng.
    dbEnv = testDatabaseConfig();
    Object.assign(process.env, dbEnv);
    process.env.BACKEND_API_KEY = API_KEY;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    // Dùng đúng pipe của production, không dựng lại bản sao.
    app.useGlobalPipes(createValidationPipe());
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    rmSync(dbEnv.UPLOAD_DIR, { recursive: true, force: true });
    for (const key of Object.keys(dbEnv)) delete process.env[key];
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

  it('đăng ký tạo tài khoản chờ duyệt, đăng nhập đòi đã duyệt', async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({
        email: 'an@example.com',
        name: 'An',
        provider: 'google',
        mode: 'register',
      })
      .expect(200);
    expect(registered.body as SyncResponse).toMatchObject({
      isNewUser: true,
      user: { status: 'inactive', loginCount: 0 },
    });

    // Chưa duyệt thì chưa vào được.
    await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'an@example.com', provider: 'google', mode: 'login' })
      .expect(403);

    // Đăng ký lại bằng email đã có cũng bị chặn.
    await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'an@example.com', provider: 'google', mode: 'register' })
      .expect(409);

    // Email lạ thì không đăng nhập được và cũng không bị tạo ngầm.
    await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'la@example.com', provider: 'google', mode: 'login' })
      .expect(404);

    await approve('an@example.com');
    const second = await login('an@example.com');
    expect(second.body as SyncResponse).toMatchObject({
      isNewUser: false,
      user: { loginCount: 1, email: 'an@example.com' },
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
      .send({ email: 'khong-phai-email', provider: 'facebook', mode: 'login' })
      .expect(400);

    // Thiếu mode cũng không hợp lệ.
    await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'an@example.com', provider: 'google' })
      .expect(400);
  });

  it('GET /api/users/stats đếm theo vai trò và trạng thái', async () => {
    await registerApproved('an@example.com');
    await request(app.getHttpServer())
      .patch('/api/users/an@example.com')
      .set('x-api-key', API_KEY)
      .send({ role: 'admin' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/api/users/stats')
      .set('x-api-key', API_KEY)
      .expect(200);

    expect(response.body).toMatchObject({
      total: 1,
      admins: 1,
      pending: 0,
      blocked: 0,
    });
  });

  it('PUT /api/users/:email/groups gán nhóm quyền', async () => {
    await registerApproved('an@example.com');
    const group = await request(app.getHttpServer())
      .post('/api/permission-groups')
      .set('x-api-key', API_KEY)
      .send({ name: 'Biên tập', permissions: ['CATEGORIES.WRITE'] })
      .expect(201);

    const groupId = (group.body as { id: string }).id;
    const updated = await request(app.getHttpServer())
      .put('/api/users/an@example.com/groups')
      .set('x-api-key', API_KEY)
      .send({ groupIds: [groupId] })
      .expect(200);

    expect(updated.body).toMatchObject({
      groups: [{ id: groupId, slug: 'bien-tap' }],
      permissions: ['CATEGORIES.WRITE'],
    });
  });

  it('tài khoản bị khoá thì POST /users/sync trả 403', async () => {
    await registerApproved('an@example.com');
    await request(app.getHttpServer())
      .patch('/api/users/an@example.com')
      .set('x-api-key', API_KEY)
      .send({ status: 'blocked' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/users/sync')
      .set('x-api-key', API_KEY)
      .send({ email: 'an@example.com', provider: 'google', mode: 'login' })
      .expect(403);
  });

  it('CRUD /api/categories', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Đồ gia dụng' })
      .expect(201);

    const id = (created.body as { id: string }).id;
    expect(created.body).toMatchObject({
      code: 'DO-GIA-DUNG',
      status: 'active',
      order: 1, // thứ tự hiển thị đánh số từ 1
    });

    const list = await request(app.getHttpServer())
      .get('/api/categories?search=gia dung')
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(list.body).toMatchObject({ total: 1 });
    expect(
      (list.body as { items: { detailCount: number }[] }).items[0],
    ).toMatchObject({ detailCount: 0 });

    const patched = await request(app.getHttpServer())
      .patch(`/api/categories/${id}`)
      .set('x-api-key', API_KEY)
      .send({ status: 'inactive', order: 3 })
      .expect(200);
    expect(patched.body).toMatchObject({ status: 'inactive', order: 3 });

    await request(app.getHttpServer())
      .delete(`/api/categories/${id}`)
      .set('x-api-key', API_KEY)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/categories/${id}`)
      .set('x-api-key', API_KEY)
      .expect(404);
  });

  it('phân trang và lọc theo nhóm ở /details', async () => {
    const tinh = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Tỉnh' })
      .expect(201);
    const tinhId = (tinh.body as { id: number }).id;

    const haNoi = await request(app.getHttpServer())
      .post(`/api/categories/${tinhId}/details`)
      .set('x-api-key', API_KEY)
      .send({ name: 'Hà Nội' })
      .expect(201);
    const hue = await request(app.getHttpServer())
      .post(`/api/categories/${tinhId}/details`)
      .set('x-api-key', API_KEY)
      .send({ name: 'Huế' })
      .expect(201);

    const px = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Phường/Xã', groupCategoryId: tinhId })
      .expect(201);
    const pxId = (px.body as { id: number }).id;

    // 7 phường thuộc Hà Nội, 3 thuộc Huế.
    for (let i = 1; i <= 10; i += 1) {
      await request(app.getHttpServer())
        .post(`/api/categories/${pxId}/details`)
        .set('x-api-key', API_KEY)
        .send({
          code: `P${i}`,
          name: `Phường ${i}`,
          order: i,
          groupDetailId:
            i <= 7
              ? (haNoi.body as { id: number }).id
              : (hue.body as { id: number }).id,
        })
        .expect(201);
    }

    const page1 = await request(app.getHttpServer())
      .get(`/api/categories/${pxId}/details?page=1&pageSize=4`)
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(page1.body).toMatchObject({
      total: 10,
      page: 1,
      pageSize: 4,
      totalPages: 3,
    });
    expect((page1.body as { items: unknown[] }).items).toHaveLength(4);

    const last = await request(app.getHttpServer())
      .get(`/api/categories/${pxId}/details?page=3&pageSize=4`)
      .set('x-api-key', API_KEY)
      .expect(200);
    expect((last.body as { items: unknown[] }).items).toHaveLength(2);

    // Danh mục có phân nhóm thì chi tiết cùng nhóm phải nằm liền khối, kể cả
    // khi duyệt hết các trang.
    const all = await request(app.getHttpServer())
      .get(`/api/categories/${pxId}/details?pageSize=200`)
      .set('x-api-key', API_KEY)
      .expect(200);
    const groupSequence = (
      all.body as { items: { group: { name: string } }[] }
    ).items.map((i) => i.group.name);
    expect(groupSequence).toHaveLength(10);
    expect(new Set(groupSequence).size).toBe(2);
    // Mỗi tên nhóm chỉ xuất hiện thành đúng một khối liên tục.
    const blocks = groupSequence.filter(
      (name, i) => name !== groupSequence[i - 1],
    );
    expect(blocks).toHaveLength(new Set(groupSequence).size);

    // Trang vượt quá thì trả trang cuối chứ không rỗng.
    const beyond = await request(app.getHttpServer())
      .get(`/api/categories/${pxId}/details?page=99&pageSize=4`)
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(beyond.body).toMatchObject({ page: 3 });

    // Lọc theo nhóm, phân trang tính trên kết quả đã lọc.
    const filtered = await request(app.getHttpServer())
      .get(
        `/api/categories/${pxId}/details?groupDetailId=${(haNoi.body as { id: number }).id}&pageSize=5`,
      )
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(filtered.body).toMatchObject({ total: 7, totalPages: 2 });

    // Lọc kết hợp tìm kiếm.
    const searched = await request(app.getHttpServer())
      .get(
        `/api/categories/${pxId}/details?groupDetailId=${(hue.body as { id: number }).id}&search=phuong`,
      )
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(searched.body).toMatchObject({ total: 3 });

    // /categories cũng phân trang.
    const cats = await request(app.getHttpServer())
      .get('/api/categories?pageSize=1')
      .set('x-api-key', API_KEY)
      .expect(200);
    expect((cats.body as { items: unknown[] }).items).toHaveLength(1);
    expect((cats.body as { total: number }).total).toBeGreaterThan(1);
  });

  it('CRUD /api/categories/:categoryId/details', async () => {
    const category = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Đồ gia dụng' })
      .expect(201);
    const categoryId = (category.body as { id: string }).id;

    const created = await request(app.getHttpServer())
      .post(`/api/categories/${categoryId}/details`)
      .set('x-api-key', API_KEY)
      .send({ name: 'Nồi cơm điện' })
      .expect(201);
    const detailId = (created.body as { id: string }).id;
    expect(created.body).toMatchObject({
      categoryId,
      code: 'NOI-COM-DIEN',
      status: 'active',
    });

    // Mã chỉ duy nhất trong phạm vi một danh mục.
    await request(app.getHttpServer())
      .post(`/api/categories/${categoryId}/details`)
      .set('x-api-key', API_KEY)
      .send({ name: 'Nồi cơm điện' })
      .expect(409);

    const other = await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Điện tử' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/categories/${(other.body as { id: string }).id}/details`)
      .set('x-api-key', API_KEY)
      .send({ name: 'Nồi cơm điện' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}/details`)
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(list.body).toMatchObject({ total: 1 });

    await request(app.getHttpServer())
      .patch(`/api/categories/${categoryId}/details/${detailId}`)
      .set('x-api-key', API_KEY)
      .send({ order: 2, status: 'inactive' })
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/api/categories/${categoryId}/details/${detailId}`)
      .set('x-api-key', API_KEY)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/api/categories/${categoryId}/details/${detailId}`)
      .set('x-api-key', API_KEY)
      .expect(404);
  });

  it('từ chối category thiếu name hoặc code sai định dạng', async () => {
    await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: '' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Hợp lệ', code: 'Không Hợp Lệ' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/categories')
      .set('x-api-key', API_KEY)
      .send({ name: 'Hợp lệ', status: 'blocked' })
      .expect(400);
  });

  it('quyền thêm vào danh mục quyền là gán được ngay', async () => {
    // Danh mục quyền được seed lúc khởi động, tìm nó qua mã.
    const cats = await request(app.getHttpServer())
      .get('/api/categories?search=DM_QUYEN')
      .set('x-api-key', API_KEY)
      .expect(200);
    const catalog = (
      cats.body as { items: { id: number; code: string }[] }
    ).items.find((c) => c.code === 'DM_QUYEN');
    expect(catalog).toBeDefined();

    // Danh mục quyền lấy danh mục chức năng làm nhóm, nên phải chọn chức năng.
    const functions = await request(app.getHttpServer())
      .get('/api/categories?search=DM_CHUC_NANG')
      .set('x-api-key', API_KEY)
      .expect(200);
    const functionCategory = (
      functions.body as { items: { id: number; code: string }[] }
    ).items.find((c) => c.code === 'DM_CHUC_NANG');
    expect(functionCategory).toBeDefined();

    const area = await request(app.getHttpServer())
      .post(`/api/categories/${functionCategory!.id}/details`)
      .set('x-api-key', API_KEY)
      .send({ code: 'REPORTS', name: 'Báo cáo' })
      .expect(201);

    // Thiếu nhóm thì bị chặn.
    await request(app.getHttpServer())
      .post(`/api/categories/${catalog!.id}/details`)
      .set('x-api-key', API_KEY)
      .send({ code: 'REPORTS.READ', name: 'Xem báo cáo' })
      .expect(400);

    // Thêm một quyền mới bằng chính API danh mục.
    const added = await request(app.getHttpServer())
      .post(`/api/categories/${catalog!.id}/details`)
      .set('x-api-key', API_KEY)
      .send({
        code: 'REPORTS.READ',
        name: 'Xem báo cáo',
        groupDetailId: (area.body as { id: number }).id,
      })
      .expect(201);
    expect(added.body).toMatchObject({ group: { name: 'Báo cáo' } });

    const permissions = await request(app.getHttpServer())
      .get('/api/permissions')
      .set('x-api-key', API_KEY)
      .expect(200);
    expect(
      (permissions.body as { items: { key: string }[] }).items.map(
        (i) => i.key,
      ),
    ).toContain('REPORTS.READ');

    // Gán được cho nhóm quyền.
    const group = await request(app.getHttpServer())
      .post('/api/permission-groups')
      .set('x-api-key', API_KEY)
      .send({ name: 'Báo cáo', permissions: ['REPORTS.READ'] })
      .expect(201);
    expect(group.body).toMatchObject({ permissions: ['REPORTS.READ'] });

    // Mã không có trong danh mục thì bị chặn.
    await request(app.getHttpServer())
      .post('/api/permission-groups')
      .set('x-api-key', API_KEY)
      .send({ name: 'Lạ', permissions: ['KHONG.CO'] })
      .expect(400);
  });

  it('GET /api/permissions đọc từ danh mục quyền trong DB', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/permissions')
      .set('x-api-key', API_KEY)
      .expect(200);

    const items = (response.body as { items: { key: string }[] }).items;
    expect(items.map((i) => i.key)).toContain('CATEGORIES.WRITE');
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
