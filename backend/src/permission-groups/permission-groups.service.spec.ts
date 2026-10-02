import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import { DatabaseModule } from '../database/database.module';
import { PermissionCatalogService } from './permission-catalog.service';
import {
  ADMIN_GROUP_SLUG,
  PermissionGroupsService,
} from './permission-groups.service';

describe('PermissionGroupsService', () => {
  let moduleRef: TestingModule;
  let groups: PermissionGroupsService;
  let catalog: PermissionCatalogService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-groups-'));

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
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('tạo sẵn nhóm Administrators đủ quyền khi DB còn trống', () => {
    const seeded = groups.list();

    expect(seeded).toHaveLength(1);
    expect(seeded[0].slug).toBe(ADMIN_GROUP_SLUG);
    expect(seeded[0].permissions).toEqual(catalog.keys().slice().sort());
    expect(seeded[0].memberCount).toBe(0);
  });

  it('không seed lại nếu đã có nhóm', () => {
    groups.onModuleInit();
    groups.onModuleInit();

    expect(groups.count()).toBe(1);
  });

  it('tạo nhóm với slug tự sinh và quyền được chọn', () => {
    const created = groups.create({
      name: 'Biên tập viên',
      permissions: ['CATEGORIES.READ', 'CATEGORIES.WRITE'],
    });

    expect(created.slug).toBe('bien-tap-vien');
    expect(created.permissions).toEqual([
      'CATEGORIES.READ',
      'CATEGORIES.WRITE',
    ]);
  });

  it('nhóm không có quyền nào vẫn hợp lệ', () => {
    expect(groups.create({ name: 'Trống' }).permissions).toEqual([]);
  });

  it('từ chối slug trùng', () => {
    expect(() =>
      groups.create({ name: 'Administrators', slug: ADMIN_GROUP_SLUG }),
    ).toThrow(/đã được dùng/);
  });

  it('cập nhật quyền là thay thế toàn bộ', () => {
    const created = groups.create({
      name: 'Nhóm A',
      permissions: ['USERS.READ', 'USERS.WRITE'],
    });

    const updated = groups.update(created.id, {
      permissions: ['CATEGORIES.READ'],
    });

    expect(updated.permissions).toEqual(['CATEGORIES.READ']);
  });

  it('không gửi permissions thì giữ nguyên quyền cũ', () => {
    const created = groups.create({
      name: 'Nhóm A',
      permissions: ['USERS.READ'],
    });

    const updated = groups.update(created.id, { name: 'Nhóm A2' });

    expect(updated.name).toBe('Nhóm A2');
    expect(updated.permissions).toEqual(['USERS.READ']);
  });

  it('xoá nhóm kéo theo bảng quyền của nhóm (ON DELETE CASCADE)', () => {
    const created = groups.create({
      name: 'Tạm',
      permissions: ['USERS.READ'],
    });

    groups.remove(created.id);

    expect(groups.findOne(created.id)).toBeNull();
    expect(() => groups.remove(created.id)).toThrow(/Không tìm thấy/);
  });

  it('assertAllExist báo lỗi với id lạ', () => {
    const created = groups.create({ name: 'Nhóm A' });

    expect(() => groups.assertAllExist([created.id])).not.toThrow();
    expect(() => groups.assertAllExist([created.id, 9999])).toThrow(
      /Không tìm thấy nhóm quyền/,
    );
  });
});
