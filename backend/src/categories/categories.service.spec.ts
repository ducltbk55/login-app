import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DatabaseModule } from '../database/database.module';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-categories-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
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
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('tự sinh code từ tên tiếng Việt', () => {
    const created = categories.create({ name: 'Đồ gia dụng' });

    expect(typeof created.id).toBe('number');
    expect(created.code).toBe('DO-GIA-DUNG');
    expect(created.status).toBe('active');
    // Thứ tự hiển thị đánh số từ 1 chứ không phải 0.
    expect(created.order).toBe(1);
  });

  it('nhận code do người dùng nhập và chuẩn hoá thành chữ hoa', () => {
    expect(categories.create({ name: 'Sách', code: 'sach_vo' }).code).toBe(
      'SACH_VO',
    );
  });

  it('từ chối code trùng', () => {
    categories.create({ name: 'Sách' });

    expect(() => categories.create({ name: 'Sách' })).toThrow(/đã được dùng/);
    // Trùng kể cả khi gõ khác hoa thường, vì code được chuẩn hoá trước khi so.
    expect(() => categories.create({ name: 'Khác', code: 'sach' })).toThrow(
      /đã được dùng/,
    );
  });

  it('cập nhật giữ nguyên field không gửi lên', () => {
    const created = categories.create({
      name: 'Sách',
      descriptions: 'Mô tả',
      order: 5,
    });

    const updated = categories.update(created.id, { name: 'Sách & Vở' });

    expect(updated.name).toBe('Sách & Vở');
    expect(updated.code).toBe('SACH'); // code không tự đổi theo name
    expect(updated.descriptions).toBe('Mô tả');
    expect(updated.order).toBe(5);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it('đổi code được, nhưng không đụng code của bản ghi khác', () => {
    const a = categories.create({ name: 'A' });
    categories.create({ name: 'B' });

    expect(categories.update(a.id, { code: 'a-moi' }).code).toBe('A-MOI');
    expect(() => categories.update(a.id, { code: 'b' })).toThrow(
      /đã được dùng/,
    );
    // Cập nhật chính nó với code cũ thì không bị coi là trùng.
    expect(categories.update(a.id, { code: 'a-moi' }).code).toBe('A-MOI');
  });

  it('lọc theo từ khoá và trạng thái', () => {
    categories.create({ name: 'Điện tử' });
    categories.create({ name: 'Thời trang', status: 'inactive' });

    expect(categories.list({ search: 'điện' })).toHaveLength(1);
    expect(categories.list({ status: 'inactive' })).toHaveLength(1);
    expect(categories.list({ status: 'active' })).toHaveLength(1);
    expect(categories.list()).toHaveLength(2);
  });

  it('sắp xếp theo order rồi đến tên', () => {
    categories.create({ name: 'Zulu', order: 1 });
    categories.create({ name: 'Alpha', order: 2 });
    categories.create({ name: 'Beta', order: 1 });

    expect(categories.list().map((c) => c.name)).toEqual([
      'Beta',
      'Zulu',
      'Alpha',
    ]);
  });

  it('danh sách kèm số chi tiết, mặc định là 0', () => {
    categories.create({ name: 'Trống' });

    expect(categories.list()[0].detailCount).toBe(0);
  });

  it('id là số tự tăng, không tái sử dụng sau khi xoá', () => {
    const a = categories.create({ name: 'A' });
    const b = categories.create({ name: 'B' });

    expect(b.id).toBe(a.id + 1);

    categories.remove(b.id);
    expect(categories.create({ name: 'C' }).id).toBe(b.id + 1);
  });

  it('xoá và báo lỗi khi id không tồn tại', () => {
    const created = categories.create({ name: 'Tạm' });
    categories.remove(created.id);

    expect(categories.count()).toBe(0);
    expect(() => categories.remove(created.id)).toThrow(/Không tìm thấy/);
    expect(() => categories.findOneOrFail(999)).toThrow(/Không tìm thấy/);
  });
});
