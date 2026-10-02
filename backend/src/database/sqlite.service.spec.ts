import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import { PermissionCatalogService } from '../permission-groups/permission-catalog.service';
import { PermissionGroupsService } from '../permission-groups/permission-groups.service';
import { UsersService } from '../users/users.service';
import { DatabaseModule } from './database.module';
import { SqliteService } from './sqlite.service';

/**
 * Dựng một DB đúng schema cũ (khoá GUID kiểu TEXT) rồi để ứng dụng tự migrate.
 *
 * Cố tình không đọc DB dev thật: dữ liệu ở đó thay đổi liên tục nên test sẽ lúc
 * đúng lúc sai, và nếu bảng rỗng thì mọi so sánh đều đúng một cách vô nghĩa.
 */
function seedLegacyDatabase(file: string): void {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      image TEXT,
      provider TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      lastLoginAt TEXT NOT NULL,
      loginCount INTEGER NOT NULL DEFAULT 1,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE login_events (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      occurredAt TEXT NOT NULL
    );
    CREATE TABLE categories (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      descriptions TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE category_details (
      id TEXT PRIMARY KEY,
      categoryId TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      descriptions TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      UNIQUE (categoryId, code)
    );
    CREATE TABLE permission_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE permission_group_permissions (
      groupId TEXT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
      permission TEXT NOT NULL,
      PRIMARY KEY (groupId, permission)
    );
    CREATE TABLE user_permission_groups (
      userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      groupId TEXT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
      assignedAt TEXT NOT NULL,
      PRIMARY KEY (userId, groupId)
    );

    INSERT INTO users (id, email, name, image, provider, createdAt, lastLoginAt, loginCount, role, status) VALUES
      ('u-aaa', 'an@example.com',  'An',  NULL, 'google', '2026-01-01T00:00:00.000Z', '2026-03-01T00:00:00.000Z', 3, 'admin', 'active'),
      ('u-bbb', 'binh@example.com','Bình',NULL, 'google', '2026-02-01T00:00:00.000Z', '2026-02-02T00:00:00.000Z', 1, 'user',  'blocked');

    INSERT INTO login_events (id, userId, provider, occurredAt) VALUES
      ('e-1', 'u-aaa', 'google', '2026-01-01T00:00:00.000Z'),
      ('e-2', 'u-aaa', 'google', '2026-02-01T00:00:00.000Z'),
      ('e-3', 'u-aaa', 'google', '2026-03-01T00:00:00.000Z'),
      ('e-4', 'u-bbb', 'google', '2026-02-02T00:00:00.000Z');

    INSERT INTO categories (id, code, name, descriptions, "order", status, createdAt, updatedAt) VALUES
      ('c-111', 'DO-GIA-DUNG', 'Đồ gia dụng', 'mô tả', 1, 'active',   '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('c-222', 'DIEN-TU',     'Điện tử',     NULL,    2, 'inactive', '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    INSERT INTO category_details (id, categoryId, code, name, descriptions, "order", status, createdAt, updatedAt) VALUES
      ('d-1', 'c-111', 'NOI',  'Nồi',      NULL, 0, 'active',   '2026-01-03T00:00:00.000Z', '2026-01-03T00:00:00.000Z'),
      ('d-2', 'c-111', 'CHAO', 'Chảo',     NULL, 1, 'inactive', '2026-01-04T00:00:00.000Z', '2026-01-04T00:00:00.000Z'),
      ('d-3', 'c-222', 'NOI',  'Nồi điện', NULL, 0, 'active',   '2026-01-05T00:00:00.000Z', '2026-01-05T00:00:00.000Z');

    INSERT INTO permission_groups (id, name, slug, description, createdAt, updatedAt) VALUES
      ('g-1', 'Administrators', 'administrators', NULL, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      ('g-2', 'Biên tập',       'bien-tap',       NULL, '2026-01-02T00:00:00.000Z', '2026-01-02T00:00:00.000Z');

    INSERT INTO permission_group_permissions (groupId, permission) VALUES
      ('g-1', 'users.read'),
      ('g-1', 'users.write'),
      ('g-2', 'categories.read');

    INSERT INTO user_permission_groups (userId, groupId, assignedAt) VALUES
      ('u-aaa', 'g-1', '2026-01-01T00:00:00.000Z'),
      ('u-bbb', 'g-2', '2026-01-02T00:00:00.000Z');
  `);
  db.close();
}

describe('SqliteService: migrate khoa GUID sang INTEGER', () => {
  let moduleRef: TestingModule;
  let tempDir: string;
  let file: string;

  let sqlite: SqliteService;
  let users: UsersService;
  let groups: PermissionGroupsService;
  let categories: CategoriesService;
  let details: CategoryDetailsService;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-idmigrate-'));
    file = path.join(tempDir, 'legacy.db');
    seedLegacyDatabase(file);

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: file })],
        }),
        DatabaseModule,
      ],
      providers: [
        UsersService,
        PermissionGroupsService,
        PermissionCatalogService,
        CategoriesService,
        CategoryDetailsService,
      ],
    }).compile();

    await moduleRef.init();
    sqlite = moduleRef.get(SqliteService);
    users = moduleRef.get(UsersService);
    groups = moduleRef.get(PermissionGroupsService);
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  const typeOf = (table: string, column: string) =>
    (
      sqlite.db.prepare(`PRAGMA table_info(${table})`).all() as {
        name: string;
        type: string;
      }[]
    ).find((c) => c.name === column)?.type;

  it('moi cot khoa deu doi sang INTEGER', () => {
    expect(typeOf('users', 'id')).toBe('INTEGER');
    expect(typeOf('users', 'accountId')).toBe('TEXT');
    expect(typeOf('login_events', 'id')).toBe('INTEGER');
    expect(typeOf('login_events', 'userId')).toBe('INTEGER');
    expect(typeOf('categories', 'id')).toBe('INTEGER');
    expect(typeOf('category_details', 'id')).toBe('INTEGER');
    expect(typeOf('category_details', 'categoryId')).toBe('INTEGER');
    expect(typeOf('permission_groups', 'id')).toBe('INTEGER');
    expect(typeOf('permission_group_permissions', 'groupId')).toBe('INTEGER');
    expect(typeOf('user_permission_groups', 'userId')).toBe('INTEGER');
    expect(typeOf('user_permission_groups', 'groupId')).toBe('INTEGER');
  });

  it('users: GUID cu thanh accountId, id moi danh theo createdAt', () => {
    const an = users.findByEmailOrFail('an@example.com');
    const binh = users.findByEmailOrFail('binh@example.com');

    expect(an.id).toBe(1); // createdAt sớm hơn nên nhận id 1
    expect(binh.id).toBe(2);
    expect(an.accountId).toBe('u-aaa');
    expect(binh.accountId).toBe('u-bbb');
    expect(an.role).toBe('admin');
    expect(binh.status).toBe('blocked');
    expect(an.loginCount).toBe(3);
  });

  it('login_events remap dung user', () => {
    const an = users.findByEmailOrFail('an@example.com');

    const history = users.findLoginHistory('an@example.com', 10);
    expect(history).toHaveLength(3);
    for (const event of history) expect(event.userId).toBe(an.id);

    expect(users.findLoginHistory('binh@example.com', 10)).toHaveLength(1);
  });

  it('category_details van gan dung danh muc cha', () => {
    const list = categories.list();
    const giaDung = list.find((c) => c.code === 'DO-GIA-DUNG')!;
    const dienTu = list.find((c) => c.code === 'DIEN-TU')!;

    expect(giaDung.detailCount).toBe(2);
    expect(dienTu.detailCount).toBe(1);

    expect(
      details
        .list(giaDung.id)
        .map((d) => d.code)
        .sort(),
    ).toEqual(['CHAO', 'NOI']);
    expect(details.list(dienTu.id).map((d) => d.code)).toEqual(['NOI']);

    // Mã 'NOI' trùng nhau giữa hai danh mục nhưng vẫn là hai bản ghi khác nhau.
    const a = details.list(giaDung.id).find((d) => d.code === 'NOI')!;
    const b = details.list(dienTu.id).find((d) => d.code === 'NOI')!;
    expect(a.id).not.toBe(b.id);
    expect(a.categoryId).toBe(giaDung.id);
    expect(b.categoryId).toBe(dienTu.id);

    // Giữ nguyên các trường ngoài khoá.
    expect(
      details.list(giaDung.id).find((d) => d.code === 'CHAO')!.status,
    ).toBe('inactive');
  });

  it('nhom quyen giu quyen, so thanh vien va lien ket voi user', () => {
    const list = groups.list();
    const admins = list.find((g) => g.slug === 'administrators')!;
    const bienTap = list.find((g) => g.slug === 'bien-tap')!;

    // Mã quyền cũ viết thường được migrate thành chữ hoa cho khớp với code
    // của chi tiết danh mục quyền.
    expect(admins.permissions).toEqual(['USERS.READ', 'USERS.WRITE']);
    expect(bienTap.permissions).toEqual(['CATEGORIES.READ']);
    expect(admins.memberCount).toBe(1);
    expect(bienTap.memberCount).toBe(1);

    expect(
      users.findDetailOrFail('binh@example.com').groups.map((g) => g.id),
    ).toEqual([bienTap.id]);
  });

  it('ghi moi sau migrate tiep tuc tang id', () => {
    const maxBefore = Math.max(...categories.list().map((c) => c.id));
    const created = categories.create({ name: 'Mới' });
    expect(created.id).toBe(maxBefore + 1);

    const detail = details.create(created.id, { name: 'Con' });
    expect(detail.categoryId).toBe(created.id);

    const synced = users.sync({ email: 'moi@example.com', provider: 'google' });
    expect(synced.user.id).toBe(3); // sau u-aaa (1) và u-bbb (2)
    expect(synced.user.accountId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('khoa ngoai bat lai sau migrate: xoa user keo theo login_events', () => {
    const an = users.findByEmailOrFail('an@example.com');

    sqlite.db.prepare('DELETE FROM users WHERE id = ?').run(an.id);

    const left = sqlite.db
      .prepare('SELECT COUNT(*) AS c FROM login_events WHERE userId = ?')
      .get(an.id) as { c: number };
    const groupLinks = sqlite.db
      .prepare(
        'SELECT COUNT(*) AS c FROM user_permission_groups WHERE userId = ?',
      )
      .get(an.id) as { c: number };

    expect(Number(left.c)).toBe(0);
    expect(Number(groupLinks.c)).toBe(0);
  });

  it('chay lai migrate lan hai khong doi gi', async () => {
    const snapshot = () => ({
      users: users.findAll().map((u) => `${u.id}:${u.accountId}`),
      categories: categories.list().map((c) => `${c.id}:${c.code}`),
      details: categories
        .list()
        .flatMap((c) =>
          details.list(c.id).map((d) => `${d.categoryId}:${d.id}:${d.code}`),
        ),
      groups: groups.list().map((g) => `${g.id}:${g.slug}`),
    });

    const first = snapshot();
    await moduleRef.close();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: file })],
        }),
        DatabaseModule,
      ],
      providers: [
        UsersService,
        PermissionGroupsService,
        PermissionCatalogService,
        CategoriesService,
        CategoryDetailsService,
      ],
    }).compile();
    await moduleRef.init();
    sqlite = moduleRef.get(SqliteService);
    users = moduleRef.get(UsersService);
    groups = moduleRef.get(PermissionGroupsService);
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);

    expect(snapshot()).toEqual(first);
  });
});
