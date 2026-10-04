/**
 * Chép dữ liệu từ file SQLite cũ (`data/app.db`) sang MySQL.
 *
 *   npm run db:import-sqlite                      # đọc data/app.db
 *   npm run db:import-sqlite -- path/to/app.db    # file khác
 *   npm run db:import-sqlite -- --replace         # xoá dữ liệu MySQL hiện có trước
 *
 * Giữ nguyên id nên mọi khoá ngoại vẫn trỏ đúng. Chỉ chép những cột có ở cả
 * hai bên. Mặc định từ chối chạy nếu bảng MySQL đã có dữ liệu (ví dụ backend
 * đã khởi động một lần và tự seed danh mục quyền) — thêm `--replace` để xoá
 * sạch rồi chép lại.
 */
import { parse } from 'dotenv';
import mysql from 'mysql2/promise';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  DEFAULT_DATABASE_NAME,
  quoteIdentifier,
} from '../src/database/database.service';
import { SCHEMA } from '../src/database/schema';

/** Thứ tự cha trước con để khoá ngoại luôn có chỗ trỏ tới. */
const TABLES = [
  'users',
  'login_events',
  'categories',
  'category_details',
  'permission_groups',
  'permission_group_permissions',
  'user_permission_groups',
  'articles',
  'products',
  'orders',
  'order_items',
  'order_events',
  'contacts',
] as const;

const BATCH_SIZE = 500;

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const name of ['.env', '.env.local']) {
    if (existsSync(name)) Object.assign(env, parse(readFileSync(name)));
  }
  return { ...env, ...(process.env as Record<string, string>) };
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const replace = args.includes('--replace');
  const file = path.resolve(
    args.find((a) => !a.startsWith('--')) ?? 'data/app.db',
  );
  if (!existsSync(file)) throw new Error(`Không thấy file SQLite: ${file}`);

  const env = loadEnv();
  const database = env.DB_NAME || DEFAULT_DATABASE_NAME;
  const server = {
    host: env.DB_HOST || '127.0.0.1',
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD ?? '',
  };

  const bootstrap = await mysql.createConnection(server);
  await bootstrap.query(
    `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(database)}
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await bootstrap.end();

  const target = await mysql.createConnection({
    ...server,
    database,
    charset: 'utf8mb4',
  });
  const source = new DatabaseSync(file, { readOnly: true });

  try {
    for (const statement of SCHEMA) await target.query(statement);

    const sourceTables = new Set(
      (
        source
          .prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
          .all() as {
          name: string;
        }[]
      ).map((r) => r.name),
    );

    if (!replace) {
      for (const table of TABLES) {
        const [rows] = await target.query(`SELECT COUNT(*) AS c FROM ${table}`);
        const count = Number((rows as { c: number }[])[0].c);
        if (count > 0) {
          throw new Error(
            `Bảng MySQL "${table}" đã có ${count} dòng. Chạy lại với --replace ` +
              'để xoá dữ liệu MySQL hiện có rồi chép từ SQLite.',
          );
        }
      }
    }

    await target.query('SET FOREIGN_KEY_CHECKS = 0');
    await target.beginTransaction();

    if (replace) {
      // DELETE thay vì TRUNCATE để còn nằm trong transaction.
      for (const table of [...TABLES].reverse())
        await target.query(`DELETE FROM ${table}`);
    }

    for (const table of TABLES) {
      if (!sourceTables.has(table)) {
        console.log(`- ${table}: không có trong SQLite, bỏ qua`);
        continue;
      }

      const sourceColumns = (
        source.prepare(`PRAGMA table_info(${table})`).all() as {
          name: string;
        }[]
      ).map((c) => c.name);
      const [targetInfo] = await target.query(
        `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [database, table],
      );
      const targetColumns = new Set(
        (targetInfo as { name: string }[]).map((c) => c.name),
      );
      const columns = sourceColumns.filter((c) => targetColumns.has(c));

      const rows = source
        .prepare(
          `SELECT ${columns.map((c) => `"${c}"`).join(', ')} FROM ${table}`,
        )
        .all() as Record<string, unknown>[];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE).map((row) =>
          columns.map((c) => {
            const value = row[c];
            return typeof value === 'bigint' ? Number(value) : value;
          }),
        );
        await target.query(
          `INSERT INTO ${table} (${columns.map(quoteIdentifier).join(', ')}) VALUES ?`,
          [batch],
        );
      }
      console.log(`- ${table}: ${rows.length} dòng`);
    }

    await target.commit();
    console.log(`\nXong: ${file} -> ${server.host}:${server.port}/${database}`);
  } catch (error) {
    await target.rollback().catch(() => undefined);
    throw error;
  } finally {
    await target.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => undefined);
    await target.end();
    source.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
