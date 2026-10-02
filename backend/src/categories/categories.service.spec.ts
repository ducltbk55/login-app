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

  it('tự sinh slug từ tên tiếng Việt', () => {
    const created = categories.create({ name: 'Đồ gia dụng' });

    expect(created.slug).toBe('do-gia-dung');
    expect(created.isActive).toBe(true);
    expect(created.sortOrder).toBe(0);
  });

  it('nhận slug do người dùng nhập', () => {
    expect(categories.create({ name: 'Sách', slug: 'sach-vo' }).slug).toBe(
      'sach-vo',
    );
  });

  it('từ chối slug trùng', () => {
    categories.create({ name: 'Sách' });

    expect(() => categories.create({ name: 'Sách' })).toThrow(/đã được dùng/);
  });

  it('cập nhật giữ nguyên field không gửi lên', () => {
    const created = categories.create({
      name: 'Sách',
      description: 'Mô tả',
      sortOrder: 5,
    });

    const updated = categories.update(created.id, { name: 'Sách & Vở' });

    expect(updated.name).toBe('Sách & Vở');
    expect(updated.slug).toBe('sach'); // slug không tự đổi theo name
    expect(updated.description).toBe('Mô tả');
    expect(updated.sortOrder).toBe(5);
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
  });

  it('đổi slug được, nhưng không đụng slug của bản ghi khác', () => {
    const a = categories.create({ name: 'A' });
    categories.create({ name: 'B' });

    expect(categories.update(a.id, { slug: 'a-moi' }).slug).toBe('a-moi');
    expect(() => categories.update(a.id, { slug: 'b' })).toThrow(
      /đã được dùng/,
    );
    // Cập nhật chính nó với slug cũ thì không bị coi là trùng.
    expect(categories.update(a.id, { slug: 'a-moi' }).slug).toBe('a-moi');
  });

  it('lọc theo từ khoá và trạng thái', () => {
    categories.create({ name: 'Điện tử' });
    categories.create({ name: 'Thời trang', isActive: false });

    expect(categories.list({ search: 'điện' })).toHaveLength(1);
    expect(categories.list({ isActive: false })).toHaveLength(1);
    expect(categories.list({ isActive: true })).toHaveLength(1);
    expect(categories.list()).toHaveLength(2);
  });

  it('sắp xếp theo sortOrder rồi đến tên', () => {
    categories.create({ name: 'Zulu', sortOrder: 1 });
    categories.create({ name: 'Alpha', sortOrder: 2 });
    categories.create({ name: 'Beta', sortOrder: 1 });

    expect(categories.list().map((c) => c.name)).toEqual([
      'Beta',
      'Zulu',
      'Alpha',
    ]);
  });

  it('xoá và báo lỗi khi id không tồn tại', () => {
    const created = categories.create({ name: 'Tạm' });
    categories.remove(created.id);

    expect(categories.count()).toBe(0);
    expect(() => categories.remove(created.id)).toThrow(/Không tìm thấy/);
    expect(() => categories.findOneOrFail('abc')).toThrow(/Không tìm thấy/);
  });
});
