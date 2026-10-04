import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => testDatabaseConfig()],
        }),
        DatabaseModule,
      ],
      providers: [CategoriesService],
    }).compile();

    await moduleRef.init();
    categories = moduleRef.get(CategoriesService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('tự sinh code từ tên tiếng Việt', async () => {
    const created = await categories.create({ name: 'Đồ gia dụng' });

    expect(typeof created.id).toBe('number');
    expect(created.code).toBe('DO-GIA-DUNG');
    expect(created.status).toBe('active');
    // Thứ tự hiển thị đánh số từ 1 chứ không phải 0.
    expect(created.order).toBe(1);
  });

  it('nhận code do người dùng nhập và chuẩn hoá thành chữ hoa', async () => {
    expect(
      (await categories.create({ name: 'Sách', code: 'sach_vo' })).code,
    ).toBe('SACH_VO');
  });

  it('từ chối code trùng', async () => {
    await categories.create({ name: 'Sách' });

    await expect(categories.create({ name: 'Sách' })).rejects.toThrow(
      /đã được dùng/,
    );
    // Trùng kể cả khi gõ khác hoa thường, vì code được chuẩn hoá trước khi so.
    await expect(
      categories.create({ name: 'Khác', code: 'sach' }),
    ).rejects.toThrow(/đã được dùng/);
  });

  it('cập nhật giữ nguyên field không gửi lên', async () => {
    const created = await categories.create({
      name: 'Sách',
      descriptions: 'Mô tả',
      order: 5,
    });

    const updated = await categories.update(created.id, { name: 'Sách & Vở' });

    expect(updated.name).toBe('Sách & Vở');
    expect(updated.code).toBe('SACH'); // code không tự đổi theo name
    expect(updated.descriptions).toBe('Mô tả');
    expect(updated.order).toBe(5);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it('đổi code được, nhưng không đụng code của bản ghi khác', async () => {
    const a = await categories.create({ name: 'A' });
    await categories.create({ name: 'B' });

    expect((await categories.update(a.id, { code: 'a-moi' })).code).toBe(
      'A-MOI',
    );
    await expect(categories.update(a.id, { code: 'b' })).rejects.toThrow(
      /đã được dùng/,
    );
    // Cập nhật chính nó với code cũ thì không bị coi là trùng.
    expect((await categories.update(a.id, { code: 'a-moi' })).code).toBe(
      'A-MOI',
    );
  });

  it('lọc theo từ khoá và trạng thái', async () => {
    await categories.create({ name: 'Điện tử' });
    await categories.create({ name: 'Thời trang', status: 'inactive' });

    expect(await categories.list({ search: 'điện' })).toHaveLength(1);
    expect(await categories.list({ status: 'inactive' })).toHaveLength(1);
    expect(await categories.list({ status: 'active' })).toHaveLength(1);
    expect(await categories.list()).toHaveLength(2);
  });

  it('sắp xếp theo order rồi đến tên', async () => {
    await categories.create({ name: 'Zulu', order: 1 });
    await categories.create({ name: 'Alpha', order: 2 });
    await categories.create({ name: 'Beta', order: 1 });

    expect((await categories.list()).map((c) => c.name)).toEqual([
      'Beta',
      'Zulu',
      'Alpha',
    ]);
  });

  it('danh sách kèm số chi tiết, mặc định là 0', async () => {
    await categories.create({ name: 'Trống' });

    expect((await categories.list())[0].detailCount).toBe(0);
  });

  it('id là số tự tăng, không tái sử dụng sau khi xoá', async () => {
    const a = await categories.create({ name: 'A' });
    const b = await categories.create({ name: 'B' });

    expect(b.id).toBe(a.id + 1);

    await categories.remove(b.id);
    expect((await categories.create({ name: 'C' })).id).toBe(b.id + 1);
  });

  it('xoá và báo lỗi khi id không tồn tại', async () => {
    const created = await categories.create({ name: 'Tạm' });
    await categories.remove(created.id);

    expect(await categories.count()).toBe(0);
    await expect(categories.remove(created.id)).rejects.toThrow(
      /Không tìm thấy/,
    );
    await expect(categories.findOneOrFail(999)).rejects.toThrow(
      /Không tìm thấy/,
    );
  });
});
