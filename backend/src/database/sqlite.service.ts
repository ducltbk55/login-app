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
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT,
        image TEXT,
        provider TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        lastLoginAt TEXT NOT NULL,
        loginCount INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS login_events (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        occurredAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_login_events_userId ON login_events(userId);

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        isActive INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permission_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS permission_group_permissions (
        groupId TEXT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
        permission TEXT NOT NULL,
        PRIMARY KEY (groupId, permission)
      );

      CREATE TABLE IF NOT EXISTS user_permission_groups (
        userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        groupId TEXT NOT NULL REFERENCES permission_groups(id) ON DELETE CASCADE,
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
  }

  /** `ALTER TABLE ADD COLUMN` sẽ lỗi nếu cột đã có, nên kiểm tra trước cho idempotent. */
  private addColumnIfMissing(
    table: string,
    column: string,
    definition: string,
  ): void {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as {
      name: string;
    }[];

    if (columns.some((c) => c.name === column)) return;

    this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    this.logger.log(`Migrate: thêm cột ${table}.${column}`);
  }
}
