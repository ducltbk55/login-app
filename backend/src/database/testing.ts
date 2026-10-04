import { parse } from 'dotenv';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * Thông tin kết nối MySQL cho test: ưu tiên biến môi trường `DB_*`, thiếu thì
 * đọc từ `.env.test` / `.env.local` của backend.
 */
function serverConfig(): Record<string, string> {
  const fromFiles: Record<string, string> = {};
  for (const name of ['.env.local', '.env.test']) {
    try {
      Object.assign(
        fromFiles,
        parse(readFileSync(path.join(__dirname, '..', '..', name))),
      );
    } catch {
      // file không tồn tại thì bỏ qua
    }
  }

  const pick = (key: string, fallback: string) =>
    process.env[key] ?? fromFiles[key] ?? fallback;

  return {
    DB_HOST: pick('DB_HOST', '127.0.0.1'),
    DB_PORT: pick('DB_PORT', '3306'),
    DB_USER: pick('DB_USER', 'root'),
    DB_PASSWORD: pick('DB_PASSWORD', ''),
  };
}

let counter = 0;

/**
 * Cấu hình cho một bộ test: database MySQL riêng (tự xoá khi module đóng) và
 * thư mục upload tạm, để các test không đụng dữ liệu của nhau hay của dev.
 */
export function testDatabaseConfig(
  overrides: Record<string, string> = {},
): Record<string, string> {
  counter += 1;
  const suffix = `${process.pid}_${Date.now().toString(36)}_${counter}`;

  return {
    ...serverConfig(),
    DB_NAME: `bp_test_${suffix}`,
    DB_DROP_ON_CLOSE: 'true',
    UPLOAD_DIR: mkdtempSync(path.join(tmpdir(), 'bp-uploads-')),
    ...overrides,
  };
}
