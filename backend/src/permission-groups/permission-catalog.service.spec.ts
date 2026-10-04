import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import {
  FUNCTION_CATEGORY_CODE,
  FUNCTION_SEEDS,
  PERMISSION_CATEGORY_CODE,
  PERMISSION_SEEDS,
} from '../common/permissions';
import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { PermissionCatalogService } from './permission-catalog.service';

describe('PermissionCatalogService', () => {
  let moduleRef: TestingModule;
  let catalog: PermissionCatalogService;
  let categories: CategoriesService;
  let details: CategoryDetailsService;

  const byCode = async (code: string) =>
    (await categories.list()).find((c) => c.code === code)!;
  const functionCategory = () => byCode(FUNCTION_CATEGORY_CODE);
  const permissionCategory = () => byCode(PERMISSION_CATEGORY_CODE);

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
  });

  it('tạo danh mục chức năng và danh mục quyền, nối nhóm với nhau', async () => {
    const functions = await functionCategory();
    const permissions = await permissionCategory();

    expect(functions).toBeDefined();
    expect(permissions.groupCategoryId).toBe(functions.id);
    expect(permissions.groupCategory).toMatchObject({
      code: FUNCTION_CATEGORY_CODE,
    });

    expect(
      (await details.list(functions.id)).map((d) => d.code).sort(),
    ).toEqual(FUNCTION_SEEDS.map((s) => s.code).sort());
    expect(
      (await details.list(permissions.id)).map((d) => d.code).sort(),
    ).toEqual(PERMISSION_SEEDS.map((s) => s.code).sort());
  });

  it('functions(): chức năng đang bật theo thứ tự, nhãn sửa được', async () => {
    expect((await catalog.functions()).map((f) => f.code)).toEqual(
      FUNCTION_SEEDS.map((s) => s.code),
    );

    const category = await functionCategory();
    const all = await details.list(category.id);
    const articles = all.find((d) => d.code === 'ARTICLES')!;
    const orders = all.find((d) => d.code === 'ORDERS')!;
    await details.update(category.id, articles.id, { name: 'Tin tức' });
    await details.update(category.id, orders.id, { status: 'inactive' });

    const functions = await catalog.functions();
    expect(functions.find((f) => f.code === 'ARTICLES')?.label).toBe('Tin tức');
    expect(functions.some((f) => f.code === 'ORDERS')).toBe(false);
  });

  it('mỗi quyền thuộc đúng chức năng, nhãn nhóm là tên tiếng Việt', async () => {
    const byKey = new Map((await catalog.list()).map((p) => [p.key, p]));

    expect(byKey.get('USERS.READ')?.group).toBe('Người dùng');
    expect(byKey.get('USERS.READ')?.label).toBe('Xem danh sách người dùng');
    expect(byKey.get('CATEGORIES.WRITE')?.group).toBe('Danh mục');
    expect(byKey.get('PERMISSION-GROUPS.WRITE')?.group).toBe('Nhóm quyền');
  });

  it('chạy lại không tạo trùng và không ghi đè sửa đổi của admin', async () => {
    const permissions = await permissionCategory();
    const target = (await details.list(permissions.id)).find(
      (d) => d.code === 'USERS.READ',
    )!;
    await details.update(permissions.id, target.id, {
      name: 'Nhãn do admin sửa',
    });

    await catalog.ensureSeeded();

    expect(await details.list(permissions.id)).toHaveLength(
      PERMISSION_SEEDS.length,
    );
    expect(
      (await categories.list()).filter(
        (c) => c.code === PERMISSION_CATEGORY_CODE,
      ),
    ).toHaveLength(1);
    expect(
      (await catalog.list()).find((p) => p.key === 'USERS.READ')?.label,
    ).toBe('Nhãn do admin sửa');
  });

  it('quyền admin tự thêm dùng được ngay, nhóm theo chức năng đã chọn', async () => {
    const functions = await functionCategory();
    const permissions = await permissionCategory();
    const reports = await details.create(functions.id, {
      code: 'REPORTS',
      name: 'Báo cáo',
    });

    await details.create(permissions.id, {
      code: 'REPORTS.READ',
      name: 'Xem báo cáo',
      groupDetailId: reports.id,
    });

    const added = (await catalog.list()).find((p) => p.key === 'REPORTS.READ');
    expect(added?.group).toBe('Báo cáo');
    await expect(
      catalog.assertAllExist(['REPORTS.READ']),
    ).resolves.toBeUndefined();
  });

  it('thêm quyền mà quên chọn chức năng thì bị chặn', async () => {
    const permissions = await permissionCategory();

    await expect(
      details.create(permissions.id, { code: 'REPORTS.READ', name: 'X' }),
    ).rejects.toThrow(/phải chọn nhóm cho chi tiết/);
  });

  it('không nhận chức năng thuộc danh mục khác', async () => {
    const permissions = await permissionCategory();
    const other = await categories.create({ name: 'Danh mục khác' });
    const stranger = await details.create(other.id, { name: 'Lạ' });

    await expect(
      details.create(permissions.id, {
        code: 'REPORTS.READ',
        name: 'X',
        groupDetailId: stranger.id,
      }),
    ).rejects.toThrow(/không thuộc danh mục nhóm đã chọn/);
  });

  it('quyền đã tắt thì không còn gán được', async () => {
    const permissions = await permissionCategory();
    const target = (await details.list(permissions.id)).find(
      (d) => d.code === 'USERS.WRITE',
    )!;
    await details.update(permissions.id, target.id, { status: 'inactive' });

    expect(await catalog.keys()).not.toContain('USERS.WRITE');
    await expect(catalog.assertAllExist(['USERS.WRITE'])).rejects.toThrow(
      /không có trong danh mục quyền hoặc đã bị tắt/,
    );
  });

  it('từ chối mã quyền lạ', async () => {
    await expect(catalog.assertAllExist(['KHONG.CO'])).rejects.toThrow(
      /KHONG.CO/,
    );
    // Mã cũ viết thường không còn hợp lệ sau khi chuẩn hoá sang chữ hoa.
    await expect(catalog.assertAllExist(['users.read'])).rejects.toThrow();
  });

  it('không xoá được chức năng đang có quyền trỏ vào', async () => {
    const functions = await functionCategory();
    const users = (await details.list(functions.id)).find(
      (d) => d.code === 'USERS',
    )!;

    await expect(details.remove(functions.id, users.id)).rejects.toThrow(
      /đang là nhóm của 2 chi tiết khác/,
    );
  });

  it('không xoá được danh mục chức năng khi danh mục quyền đang dùng', async () => {
    await expect(
      categories.remove((await functionCategory()).id),
    ).rejects.toThrow(/đang được dùng làm nhóm/);
  });

  it('xoá hết chi tiết thì danh mục quyền rỗng, không vỡ', async () => {
    const permissions = await permissionCategory();
    for (const detail of await details.list(permissions.id)) {
      await details.remove(permissions.id, detail.id);
    }

    expect(await catalog.list()).toEqual([]);
    await expect(catalog.assertAllExist([])).resolves.toBeUndefined();
  });
});
