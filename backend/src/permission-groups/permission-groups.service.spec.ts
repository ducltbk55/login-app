import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { PermissionCatalogService } from './permission-catalog.service';
import {
  ADMIN_GROUP_SLUG,
  PermissionGroupsService,
} from './permission-groups.service';

describe('PermissionGroupsService', () => {
  let moduleRef: TestingModule;
  let groups: PermissionGroupsService;
  let catalog: PermissionCatalogService;

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
        PermissionGroupsService,
        PermissionCatalogService,
        CategoriesService,
        CategoryDetailsService,
      ],
    }).compile();

    await moduleRef.init();
    groups = moduleRef.get(PermissionGroupsService);
    catalog = moduleRef.get(PermissionCatalogService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('tạo sẵn nhóm Administrators đủ quyền khi DB còn trống', async () => {
    const seeded = await groups.list();

    expect(seeded).toHaveLength(1);
    expect(seeded[0].slug).toBe(ADMIN_GROUP_SLUG);
    expect(seeded[0].permissions).toEqual(
      (await catalog.keys()).slice().sort(),
    );
    expect(seeded[0].memberCount).toBe(0);
  });

  it('không seed lại nếu đã có nhóm', async () => {
    await groups.onModuleInit();
    await groups.onModuleInit();

    expect(await groups.count()).toBe(1);
  });

  it('tạo nhóm với slug tự sinh và quyền được chọn', async () => {
    const created = await groups.create({
      name: 'Biên tập viên',
      permissions: ['CATEGORIES.READ', 'CATEGORIES.WRITE'],
    });

    expect(created.slug).toBe('bien-tap-vien');
    expect(created.permissions).toEqual([
      'CATEGORIES.READ',
      'CATEGORIES.WRITE',
    ]);
  });

  it('nhóm không có quyền nào vẫn hợp lệ', async () => {
    expect((await groups.create({ name: 'Trống' })).permissions).toEqual([]);
  });

  it('từ chối slug trùng', async () => {
    await expect(
      groups.create({ name: 'Administrators', slug: ADMIN_GROUP_SLUG }),
    ).rejects.toThrow(/đã được dùng/);
  });

  it('cập nhật quyền là thay thế toàn bộ', async () => {
    const created = await groups.create({
      name: 'Nhóm A',
      permissions: ['USERS.READ', 'USERS.WRITE'],
    });

    const updated = await groups.update(created.id, {
      permissions: ['CATEGORIES.READ'],
    });

    expect(updated.permissions).toEqual(['CATEGORIES.READ']);
  });

  it('không gửi permissions thì giữ nguyên quyền cũ', async () => {
    const created = await groups.create({
      name: 'Nhóm A',
      permissions: ['USERS.READ'],
    });

    const updated = await groups.update(created.id, { name: 'Nhóm A2' });

    expect(updated.name).toBe('Nhóm A2');
    expect(updated.permissions).toEqual(['USERS.READ']);
  });

  it('xoá nhóm kéo theo bảng quyền của nhóm (ON DELETE CASCADE)', async () => {
    const created = await groups.create({
      name: 'Tạm',
      permissions: ['USERS.READ'],
    });

    await groups.remove(created.id);

    expect(await groups.findOne(created.id)).toBeNull();
    await expect(groups.remove(created.id)).rejects.toThrow(/Không tìm thấy/);
  });

  it('assertAllExist báo lỗi với id lạ', async () => {
    const created = await groups.create({ name: 'Nhóm A' });

    await expect(groups.assertAllExist([created.id])).resolves.toBeUndefined();
    await expect(groups.assertAllExist([created.id, 9999])).rejects.toThrow(
      /Không tìm thấy nhóm quyền/,
    );
  });
});
