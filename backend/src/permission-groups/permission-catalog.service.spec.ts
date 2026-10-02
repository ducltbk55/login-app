import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import {
  FUNCTION_CATEGORY_CODE,
  FUNCTION_SEEDS,
  PERMISSION_CATEGORY_CODE,
  PERMISSION_SEEDS,
} from '../common/permissions';
import { DatabaseModule } from '../database/database.module';
import { PermissionCatalogService } from './permission-catalog.service';

describe('PermissionCatalogService', () => {
  let moduleRef: TestingModule;
  let tempDir: string;
  let catalog: PermissionCatalogService;
  let categories: CategoriesService;
  let details: CategoryDetailsService;

  const byCode = (code: string) =>
    categories.list().find((c) => c.code === code)!;
  const functionCategory = () => byCode(FUNCTION_CATEGORY_CODE);
  const permissionCategory = () => byCode(PERMISSION_CATEGORY_CODE);

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-catalog-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
        }),
        DatabaseModule,
      ],
      providers: [
        PermissionCatalogService,
        CategoriesService,
        CategoryDetailsService,
      ],
    }).compile();

    await moduleRef.init();
    catalog = moduleRef.get(PermissionCatalogService);
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('tạo danh mục chức năng và danh mục quyền, nối nhóm với nhau', () => {
    const functions = functionCategory();
    const permissions = permissionCategory();

    expect(functions).toBeDefined();
    expect(permissions.groupCategoryId).toBe(functions.id);
    expect(permissions.groupCategory).toMatchObject({
      code: FUNCTION_CATEGORY_CODE,
    });

    expect(
      details
        .list(functions.id)
        .map((d) => d.code)
        .sort(),
    ).toEqual(FUNCTION_SEEDS.map((s) => s.code).sort());
    expect(
      details
        .list(permissions.id)
        .map((d) => d.code)
        .sort(),
    ).toEqual(PERMISSION_SEEDS.map((s) => s.code).sort());
  });

  it('mỗi quyền thuộc đúng chức năng, nhãn nhóm là tên tiếng Việt', () => {
    const byKey = new Map(catalog.list().map((p) => [p.key, p]));

    expect(byKey.get('USERS.READ')?.group).toBe('Người dùng');
    expect(byKey.get('USERS.READ')?.label).toBe('Xem danh sách người dùng');
    expect(byKey.get('CATEGORIES.WRITE')?.group).toBe('Danh mục');
    expect(byKey.get('PERMISSION-GROUPS.WRITE')?.group).toBe('Nhóm quyền');
  });

  it('chạy lại không tạo trùng và không ghi đè sửa đổi của admin', () => {
    const permissions = permissionCategory();
    const target = details
      .list(permissions.id)
      .find((d) => d.code === 'USERS.READ')!;
    details.update(permissions.id, target.id, { name: 'Nhãn do admin sửa' });

    catalog.ensureSeeded();

    expect(details.list(permissions.id)).toHaveLength(PERMISSION_SEEDS.length);
    expect(
      categories.list().filter((c) => c.code === PERMISSION_CATEGORY_CODE),
    ).toHaveLength(1);
    expect(catalog.list().find((p) => p.key === 'USERS.READ')?.label).toBe(
      'Nhãn do admin sửa',
    );
  });

  it('quyền admin tự thêm dùng được ngay, nhóm theo chức năng đã chọn', () => {
    const functions = functionCategory();
    const permissions = permissionCategory();
    const reports = details.create(functions.id, {
      code: 'REPORTS',
      name: 'Báo cáo',
    });

    details.create(permissions.id, {
      code: 'REPORTS.READ',
      name: 'Xem báo cáo',
      groupDetailId: reports.id,
    });

    const added = catalog.list().find((p) => p.key === 'REPORTS.READ');
    expect(added?.group).toBe('Báo cáo');
    expect(() => catalog.assertAllExist(['REPORTS.READ'])).not.toThrow();
  });

  it('thêm quyền mà quên chọn chức năng thì bị chặn', () => {
    const permissions = permissionCategory();

    expect(() =>
      details.create(permissions.id, { code: 'REPORTS.READ', name: 'X' }),
    ).toThrow(/phải chọn nhóm cho chi tiết/);
  });

  it('không nhận chức năng thuộc danh mục khác', () => {
    const permissions = permissionCategory();
    const other = categories.create({ name: 'Danh mục khác' });
    const stranger = details.create(other.id, { name: 'Lạ' });

    expect(() =>
      details.create(permissions.id, {
        code: 'REPORTS.READ',
        name: 'X',
        groupDetailId: stranger.id,
      }),
    ).toThrow(/không thuộc danh mục nhóm đã chọn/);
  });

  it('quyền đã tắt thì không còn gán được', () => {
    const permissions = permissionCategory();
    const target = details
      .list(permissions.id)
      .find((d) => d.code === 'USERS.WRITE')!;
    details.update(permissions.id, target.id, { status: 'inactive' });

    expect(catalog.keys()).not.toContain('USERS.WRITE');
    expect(() => catalog.assertAllExist(['USERS.WRITE'])).toThrow(
      /không có trong danh mục quyền hoặc đã bị tắt/,
    );
  });

  it('từ chối mã quyền lạ', () => {
    expect(() => catalog.assertAllExist(['KHONG.CO'])).toThrow(/KHONG.CO/);
    // Mã cũ viết thường không còn hợp lệ sau khi chuẩn hoá sang chữ hoa.
    expect(() => catalog.assertAllExist(['users.read'])).toThrow();
  });

  it('không xoá được chức năng đang có quyền trỏ vào', () => {
    const functions = functionCategory();
    const users = details.list(functions.id).find((d) => d.code === 'USERS')!;

    expect(() => details.remove(functions.id, users.id)).toThrow(
      /đang là nhóm của 2 chi tiết khác/,
    );
  });

  it('không xoá được danh mục chức năng khi danh mục quyền đang dùng', () => {
    expect(() => categories.remove(functionCategory().id)).toThrow(
      /đang được dùng làm nhóm/,
    );
  });

  it('xoá hết chi tiết thì danh mục quyền rỗng, không vỡ', () => {
    const permissions = permissionCategory();
    for (const detail of details.list(permissions.id)) {
      details.remove(permissions.id, detail.id);
    }

    expect(catalog.list()).toEqual([]);
    expect(() => catalog.assertAllExist([])).not.toThrow();
  });
});
