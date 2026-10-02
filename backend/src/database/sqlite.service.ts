import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/** Thời gian chờ khi file đang bị tiến trình khác giữ để ghi. */
const BUSY_TIMEOUT_MS = 5000;

/**
 * Kết nối SQLite bằng module `node:sqlite` có sẵn trong Node.js (>= 22.5),
 * nên không cần cài thêm native module nào.
 */
@Injectable()
export class SqliteService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqliteService.name);
  private database?: DatabaseSync;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const file = this.config.get<string>('DATABASE_FILE') ?? 'data/app.db';
    const absolute = path.isAbsolute(file)
      ? file
      : path.join(process.cwd(), file);
    mkdirSync(path.dirname(absolute), { recursive: true });

    this.database = new DatabaseSync(absolute);
    this.database.exec('PRAGMA journal_mode = WAL');
    this.database.exec('PRAGMA foreign_keys = ON');
    // `node:sqlite` mặc định busy_timeout = 0: gặp tranh chấp là ném
    // "database is locked" ngay, không chờ lấy một nhịp. WAL cho nhiều người
    // đọc song song nhưng chỉ một người ghi, nên chỉ cần một script CLI
    // (`seed:vn`, `set-role`) chạy cùng lúc với server là đủ gặp lỗi đó.
    // Chờ tối đa 5 giây thì những va chạm thoáng qua tự giải quyết.
    this.database.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    this.migrate();
    this.logger.log(`SQLite đã sẵn sàng: ${absolute}`);
  }

  onModuleDestroy(): void {
    this.database?.close();
    this.database = undefined;
  }

  get db(): DatabaseSync {
    if (!this.database) {
      throw new Error('SQLite chưa được khởi tạo');
    }
    return this.database;
  }

  /**
   * Chạy `work` trong một transaction: COMMIT nếu xong, ROLLBACK nếu có lỗi.
   * `work` phải đồng bộ — `node:sqlite` là API đồng bộ nên không có await ở giữa.
   */
  transaction<T>(work: () => T): T {
    const db = this.db;
    db.exec('BEGIN');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        image TEXT,
        provider TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastLoginAt TEXT NOT NULL,
        loginCount INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS login_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        occurredAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_login_events_userId ON login_events(userId);

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        descriptions TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permission_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permission_group_permissions (
        groupId INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
        permission TEXT NOT NULL,
        PRIMARY KEY (groupId, permission)
      );

      CREATE TABLE IF NOT EXISTS user_permission_groups (
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        groupId INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
        assignedAt TEXT NOT NULL,
        PRIMARY KEY (userId, groupId)
      );

      CREATE INDEX IF NOT EXISTS idx_user_groups_groupId
        ON user_permission_groups(groupId);
    `);

    // Bảng `users` đã tồn tại từ trước nên hai cột này phải thêm bằng ALTER TABLE.
    this.addColumnIfMissing('users', 'role', `TEXT NOT NULL DEFAULT 'user'`);
    this.addColumnIfMissing(
      'users',
      'status',
      `TEXT NOT NULL DEFAULT 'active'`,
    );

    // Phải chạy TRƯỚC khi tạo category_details: bước này drop/tạo lại bảng
    // categories, mà category_details có khoá ngoại trỏ sang đó.
    this.migrateCategoriesToCodeSchema();

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS category_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        descriptions TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE (categoryId, code)
      );

      CREATE INDEX IF NOT EXISTS idx_category_details_categoryId
        ON category_details(categoryId);
    `);

    // Bước cuối: mọi khoá chính/khoá ngoại chuyển từ GUID (TEXT) sang INTEGER.
    this.migrateIdsToInteger();
    this.migratePermissionCodesToUpperCase();

    // Hồ sơ thành viên: Google chỉ cho tên/email/ảnh, phần còn lại người dùng
    // tự khai sau khi đăng nhập lần đầu. Tất cả đều NULL được vì tài khoản vừa
    // tạo thì chưa có gì.
    for (const column of [
      'phone',
      'gender',
      'birthDate',
      'addressLine',
      'provinceCode',
      'wardCode',
    ]) {
      this.addColumnIfMissing('users', column, 'TEXT');
    }

    // Phân nhóm: một danh mục có thể lấy danh mục khác làm "nhóm", khi đó mỗi
    // chi tiết thuộc về một chi tiết của danh mục nhóm đó.
    // SQLite cho ADD COLUMN kèm REFERENCES miễn là mặc định NULL.
    this.addColumnIfMissing(
      'categories',
      'groupCategoryId',
      'INTEGER REFERENCES categories(id)',
    );
    this.addColumnIfMissing(
      'category_details',
      'groupDetailId',
      'INTEGER REFERENCES category_details(id)',
    );
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_categories_groupCategoryId
        ON categories(groupCategoryId);
      CREATE INDEX IF NOT EXISTS idx_category_details_groupDetailId
        ON category_details(groupDetailId);
    `);
  }

  /**
   * Mã quyền giờ là `code` của chi tiết danh mục, mà code luôn được chuẩn hoá
   * thành chữ hoa (`users.read` -> `USERS.READ`). Đổi các bản ghi cũ cho khớp,
   * nếu không nhóm quyền sẽ mất sạch quyền sau khi nâng cấp.
   *
   * Mệnh đề WHERE khiến lần chạy sau không còn hàng nào để sửa.
   */
  private migratePermissionCodesToUpperCase(): void {
    const result = this.db
      .prepare(
        `UPDATE permission_group_permissions
            SET permission = UPPER(permission)
          WHERE permission <> UPPER(permission)`,
      )
      .run();

    const changed = Number(result.changes);
    if (changed > 0) {
      this.logger.log(`Migrate: viết hoa ${changed} mã quyền của nhóm quyền`);
    }
  }

  /**
   * Đổi toàn bộ khoá chính và khoá ngoại từ GUID (TEXT) sang INTEGER tự tăng,
   * đồng thời giữ GUID cũ của `users` lại ở cột `accountId`.
   *
   * SQLite không đổi được kiểu cột nên phải dựng bảng mới rồi copy. ID mới được
   * đánh bằng ROW_NUMBER() vào bảng ánh xạ tạm, nhờ đó mọi khoá ngoại trỏ lại
   * đúng bản ghi. Nhận biết schema cũ bằng việc `users` chưa có cột `accountId`.
   */
  private migrateIdsToInteger(): void {
    const userColumns = this.columnsOf('users');
    if (userColumns.length === 0 || userColumns.includes('accountId')) return;

    // PRAGMA không có tác dụng bên trong transaction nên phải tắt từ ngoài:
    // trong lúc tráo bảng, khoá ngoại tạm thời trỏ vào bảng sắp bị xoá.
    this.db.exec('PRAGMA foreign_keys = OFF');
    try {
      this.transaction(() => this.rebuildWithIntegerIds());
    } finally {
      this.db.exec('PRAGMA foreign_keys = ON');
    }

    this.logger.log(
      'Migrate: toàn bộ id chuyển sang INTEGER, users.accountId giữ GUID cũ',
    );
  }

  private rebuildWithIntegerIds(): void {
    this.db.exec(`
      /* ---- bảng ánh xạ GUID cũ -> id số mới ---- */
      CREATE TABLE _map_users AS
        SELECT id AS oldId, ROW_NUMBER() OVER (ORDER BY createdAt, rowid) AS newId
          FROM users;
      CREATE TABLE _map_groups AS
        SELECT id AS oldId, ROW_NUMBER() OVER (ORDER BY createdAt, rowid) AS newId
          FROM permission_groups;
      CREATE TABLE _map_categories AS
        SELECT id AS oldId, ROW_NUMBER() OVER (ORDER BY createdAt, rowid) AS newId
          FROM categories;

      /* ---- bảng mới ---- */
      CREATE TABLE users_int (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        accountId TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        image TEXT,
        provider TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        lastLoginAt TEXT NOT NULL,
        loginCount INTEGER NOT NULL DEFAULT 1
      );
      INSERT INTO users_int
        (id, accountId, email, name, image, provider, role, status,
         createdAt, lastLoginAt, loginCount)
        SELECT m.newId, u.id, u.email, u.name, u.image, u.provider,
               u.role, u.status, u.createdAt, u.lastLoginAt, u.loginCount
          FROM users u JOIN _map_users m ON m.oldId = u.id;

      CREATE TABLE permission_groups_int (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      INSERT INTO permission_groups_int
        (id, name, slug, description, createdAt, updatedAt)
        SELECT m.newId, g.name, g.slug, g.description, g.createdAt, g.updatedAt
          FROM permission_groups g JOIN _map_groups m ON m.oldId = g.id;

      CREATE TABLE categories_int (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        descriptions TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      INSERT INTO categories_int
        (id, code, name, descriptions, "order", status, createdAt, updatedAt)
        SELECT m.newId, c.code, c.name, c.descriptions, c."order", c.status,
               c.createdAt, c.updatedAt
          FROM categories c JOIN _map_categories m ON m.oldId = c.id;

      CREATE TABLE category_details_int (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        categoryId INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        descriptions TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE (categoryId, code)
      );
      INSERT INTO category_details_int
        (id, categoryId, code, name, descriptions, "order", status,
         createdAt, updatedAt)
        SELECT ROW_NUMBER() OVER (ORDER BY d.createdAt, d.rowid), m.newId,
               d.code, d.name, d.descriptions, d."order", d.status,
               d.createdAt, d.updatedAt
          FROM category_details d JOIN _map_categories m ON m.oldId = d.categoryId;

      CREATE TABLE login_events_int (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        occurredAt TEXT NOT NULL
      );
      INSERT INTO login_events_int (id, userId, provider, occurredAt)
        SELECT ROW_NUMBER() OVER (ORDER BY e.occurredAt, e.rowid), m.newId,
               e.provider, e.occurredAt
          FROM login_events e JOIN _map_users m ON m.oldId = e.userId;

      CREATE TABLE permission_group_permissions_int (
        groupId INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
        permission TEXT NOT NULL,
        PRIMARY KEY (groupId, permission)
      );
      INSERT INTO permission_group_permissions_int (groupId, permission)
        SELECT m.newId, p.permission
          FROM permission_group_permissions p
          JOIN _map_groups m ON m.oldId = p.groupId;

      CREATE TABLE user_permission_groups_int (
        userId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        groupId INTEGER NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
        assignedAt TEXT NOT NULL,
        PRIMARY KEY (userId, groupId)
      );
      INSERT INTO user_permission_groups_int (userId, groupId, assignedAt)
        SELECT mu.newId, mg.newId, ug.assignedAt
          FROM user_permission_groups ug
          JOIN _map_users mu ON mu.oldId = ug.userId
          JOIN _map_groups mg ON mg.oldId = ug.groupId;

      /* ---- tráo bảng: xoá hết bảng cũ rồi mới đổi tên, tránh đụng tên ---- */
      DROP TABLE user_permission_groups;
      DROP TABLE permission_group_permissions;
      DROP TABLE login_events;
      DROP TABLE category_details;
      DROP TABLE categories;
      DROP TABLE permission_groups;
      DROP TABLE users;

      ALTER TABLE users_int RENAME TO users;
      ALTER TABLE permission_groups_int RENAME TO permission_groups;
      ALTER TABLE categories_int RENAME TO categories;
      ALTER TABLE category_details_int RENAME TO category_details;
      ALTER TABLE login_events_int RENAME TO login_events;
      ALTER TABLE permission_group_permissions_int
        RENAME TO permission_group_permissions;
      ALTER TABLE user_permission_groups_int RENAME TO user_permission_groups;

      DROP TABLE _map_users;
      DROP TABLE _map_groups;
      DROP TABLE _map_categories;

      /* Index nằm trên bảng cũ nên bị xoá theo, phải tạo lại. */
      CREATE INDEX IF NOT EXISTS idx_login_events_userId ON login_events(userId);
      CREATE INDEX IF NOT EXISTS idx_user_groups_groupId
        ON user_permission_groups(groupId);
      CREATE INDEX IF NOT EXISTS idx_category_details_categoryId
        ON category_details(categoryId);
    `);
  }

  private columnsOf(table: string): string[] {
    const rows = this.db.prepare(`PRAGMA table_info(${table})`).all() as {
      name: string;
    }[];
    return rows.map((r) => r.name);
  }

  /**
   * Đưa bảng `categories` từ schema cũ (slug/description/sortOrder/isActive)
   * sang schema mới (code/descriptions/order/status).
   *
   * SQLite không đổi được kiểu cột nên phải dựng bảng mới rồi copy sang. Nhận
   * biết schema cũ bằng cột `slug`; DB mới tạo đã đúng schema nên bỏ qua.
   */
  private migrateCategoriesToCodeSchema(): void {
    if (!this.columnsOf('categories').includes('slug')) return;

    this.transaction(() => {
      this.db.exec(`
        CREATE TABLE categories_new (
          id TEXT PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          descriptions TEXT,
          "order" INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );

        INSERT INTO categories_new
          (id, code, name, descriptions, "order", status, createdAt, updatedAt)
        SELECT
          id,
          UPPER(slug),
          name,
          description,
          sortOrder,
          CASE WHEN isActive = 1 THEN 'active' ELSE 'inactive' END,
          createdAt,
          updatedAt
        FROM categories;

        DROP TABLE categories;
        ALTER TABLE categories_new RENAME TO categories;
      `);
    });

    this.logger.log('Migrate: categories chuyển sang schema code/status');
  }

  /** `ALTER TABLE ADD COLUMN` sẽ lỗi nếu cột đã có, nên kiểm tra trước cho idempotent. */
  private addColumnIfMissing(
    table: string,
    column: string,
    definition: string,
  ): void {
    if (this.columnsOf(table).includes(column)) return;

    this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    this.logger.log(`Migrate: thêm cột ${table}.${column}`);
  }
}
