import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'node:async_hooks';
import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from 'mysql2/promise';

import { MIGRATIONS, type Migration } from './migrations';
import { SCHEMA } from './schema';

export const DEFAULT_DATABASE_NAME = 'business-platform';

const MIGRATION_LOCK = 'business-platform:migrate';
const MIGRATION_LOCK_TIMEOUT_S = 60;

/** Mảng lồng nhau dùng cho `IN (?)` hoặc INSERT nhiều dòng `VALUES ?`. */
export type SqlParam =
  string | number | boolean | null | Date | Buffer | SqlParam[];

export type RunResult = {
  /** Số dòng bị ảnh hưởng (UPDATE tính cả dòng khớp nhưng không đổi giá trị). */
  changes: number;
  /** Id AUTO_INCREMENT vừa cấp, 0 nếu câu lệnh không INSERT. */
  lastInsertId: number;
};

/** Đọc cấu hình kết nối MySQL từ biến môi trường (`DB_*`). */
export function databaseOptions(config: ConfigService) {
  return {
    host: config.get<string>('DB_HOST') ?? '127.0.0.1',
    port: Number(config.get<string>('DB_PORT') ?? 3306),
    user: config.get<string>('DB_USER') ?? 'root',
    password: config.get<string>('DB_PASSWORD') ?? '',
    database: config.get<string>('DB_NAME') ?? DEFAULT_DATABASE_NAME,
  };
}

/** Bọc tên định danh bằng backtick — tên DB `business-platform` có dấu gạch. */
export function quoteIdentifier(name: string): string {
  return '`' + name.replace(/`/g, '``') + '`';
}

/**
 * Kết nối MySQL qua pool của `mysql2`.
 *
 * Mọi câu lệnh chạy bên trong `transaction()` tự động đi qua đúng một kết nối
 * (theo dõi bằng AsyncLocalStorage), nên các service chỉ việc gọi
 * `all/get/run` mà không phải truyền kết nối qua từng hàm.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: Pool;
  private readonly current = new AsyncLocalStorage<PoolConnection>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const { database, ...server } = databaseOptions(this.config);

    // Tạo database nếu chưa có, để máy mới chỉ cần một MySQL server trống.
    const bootstrap = await mysql.createConnection(server);
    try {
      await bootstrap.query(
        `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)}
           CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
    } finally {
      await bootstrap.end();
    }

    this.pool = mysql.createPool({
      ...server,
      database,
      charset: 'utf8mb4',
      connectionLimit: 10,
      // Ngày giờ lưu dạng chuỗi ISO; SUM()/DECIMAL trả về number thay vì string.
      dateStrings: true,
      decimalNumbers: true,
    });

    await this.migrate();
    this.logger.log(
      `MySQL đã sẵn sàng: ${server.host}:${server.port}/${database}`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    const pool = this.pool;
    this.pool = undefined;
    if (!pool) return;

    // Chỉ dùng cho test: mỗi bộ test có database riêng và tự dọn khi xong.
    if (this.config.get<string>('DB_DROP_ON_CLOSE') === 'true') {
      const { database } = databaseOptions(this.config);
      await pool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(database)}`);
    }
    await pool.end();
  }

  private get executor(): Pool | PoolConnection {
    const connection = this.current.getStore();
    if (connection) return connection;
    if (!this.pool) throw new Error('MySQL chưa được khởi tạo');
    return this.pool;
  }

  /** Mọi dòng kết quả của một câu SELECT. */
  async all<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
    const [rows] = await this.executor.query<RowDataPacket[]>(sql, params);
    return rows as T[];
  }

  /** Dòng đầu tiên, hoặc `undefined` nếu không có. */
  async get<T>(sql: string, params: SqlParam[] = []): Promise<T | undefined> {
    const rows = await this.all<T>(sql, params);
    return rows[0];
  }

  /** INSERT/UPDATE/DELETE/DDL. */
  async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
    const [result] = await this.executor.query<ResultSetHeader>(sql, params);
    return {
      changes: Number(result.affectedRows ?? 0),
      lastInsertId: Number(result.insertId ?? 0),
    };
  }

  /**
   * Chạy `work` trong một transaction: COMMIT nếu xong, ROLLBACK nếu có lỗi.
   * Gọi lồng nhau thì dùng lại transaction bên ngoài.
   */
  async transaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.current.getStore()) return work();
    if (!this.pool) throw new Error('MySQL chưa được khởi tạo');

    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await this.current.run(connection, work);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Tạo bảng/index còn thiếu rồi chạy các migration dữ liệu chưa chạy.
   *
   * Gọi tự động mỗi lần khởi động, nên deploy bản mới là database được nâng
   * cấp luôn; `npm run migrate` gọi cùng hàm này khi muốn chạy riêng.
   */
  async migrate(): Promise<void> {
    for (const statement of SCHEMA) {
      await this.run(statement);
    }

    // Chỉ test bỏ qua: mỗi bộ test cần database trống để tự dựng dữ liệu.
    if (this.config.get<string>('DB_SKIP_MIGRATIONS') === 'true') return;
    await this.runMigrations(MIGRATIONS);
  }

  /**
   * Chạy lần lượt các migration chưa có trong bảng `migrations`, mỗi cái một
   * transaction. Khoá GET_LOCK giữ cho hai instance khởi động cùng lúc không
   * chạy trùng một migration.
   */
  async runMigrations(migrations: readonly Migration[]): Promise<void> {
    if (!this.pool) throw new Error('MySQL chưa được khởi tạo');

    const connection = await this.pool.getConnection();
    try {
      const [lock] = await connection.query<RowDataPacket[]>(
        `SELECT GET_LOCK(?, ?) AS acquired`,
        [MIGRATION_LOCK, MIGRATION_LOCK_TIMEOUT_S],
      );
      if (Number(lock[0]?.acquired) !== 1) {
        throw new Error(
          'Không lấy được khoá migration (instance khác đang chạy?)',
        );
      }

      try {
        const applied = new Set(
          (await this.all<{ name: string }>('SELECT name FROM migrations')).map(
            (row) => row.name,
          ),
        );

        for (const migration of migrations) {
          if (applied.has(migration.name)) continue;

          const started = Date.now();
          await this.transaction(async () => {
            await migration.up(this);
            await this.run(
              'INSERT INTO migrations (name, appliedAt) VALUES (?, ?)',
              [migration.name, new Date().toISOString()],
            );
          });
          this.logger.log(
            `Migration: ${migration.name} (${Date.now() - started}ms)`,
          );
        }
      } finally {
        await connection.query('SELECT RELEASE_LOCK(?)', [MIGRATION_LOCK]);
      }
    } finally {
      connection.release();
    }
  }
}
