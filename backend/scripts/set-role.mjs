/**
 * Bootstrap admin đầu tiên (vì role chỉ đổi được từ trong trang admin, mà muốn vào
 * trang admin thì đã phải là admin).
 *
 *   npm run set-role -- ban@gmail.com admin
 *   npm run set-role -- ban@gmail.com user
 */
import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';

const [email, role = 'admin'] = process.argv.slice(2);

if (!email || !['admin', 'user'].includes(role)) {
  console.error('Dùng: npm run set-role -- <email> [admin|user]');
  process.exit(1);
}

/**
 * Đọc các biến `DB_*` từ .env.local rồi .env mà không cần thêm dependency.
 * File đứng trước được ưu tiên; biến môi trường thật ưu tiên hơn cả.
 */
function readEnv() {
  const env = {};
  for (const name of ['.env.local', '.env']) {
    try {
      for (const raw of readFileSync(name, 'utf8').split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#') || !line.includes('=')) continue;
        const key = line.slice(0, line.indexOf('=')).trim();
        let value = line.slice(line.indexOf('=') + 1).trim();
        if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
        if (!(key in env)) env[key] = value;
      }
    } catch {
      // file không tồn tại thì thử file kế tiếp
    }
  }
  return { ...env, ...process.env };
}

const env = readEnv();
const database = env.DB_NAME || 'business-platform';
const host = env.DB_HOST || '127.0.0.1';
const port = Number(env.DB_PORT || 3306);

const db = await mysql.createConnection({
  host,
  port,
  user: env.DB_USER || 'root',
  password: env.DB_PASSWORD ?? '',
  database,
  charset: 'utf8mb4',
});

try {
  const [rows] = await db.query(
    'SELECT id, email, role FROM users WHERE email = ?',
    [email],
  );
  const user = rows[0];

  if (!user) {
    console.error(`Không tìm thấy ${email} trong ${host}:${port}/${database}.`);
    console.error('Hãy đăng nhập bằng Google một lần trước để tạo bản ghi.');
    process.exitCode = 1;
  } else {
    await db.query('UPDATE users SET role = ? WHERE id = ?', [role, user.id]);
    console.log(`${email}: role ${user.role} -> ${role}`);
  }
} finally {
  await db.end();
}
