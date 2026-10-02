/**
 * Bootstrap admin đầu tiên (vì role chỉ đổi được từ trong trang admin, mà muốn vào
 * trang admin thì đã phải là admin).
 *
 *   npm run set-role -- ban@gmail.com admin
 *   npm run set-role -- ban@gmail.com user
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [email, role = 'admin'] = process.argv.slice(2);

if (!email || !['admin', 'user'].includes(role)) {
  console.error('Dùng: npm run set-role -- <email> [admin|user]');
  process.exit(1);
}

/** Đọc DATABASE_FILE từ .env.local mà không cần thêm dependency. */
function databaseFile() {
  for (const name of ['.env.local', '.env']) {
    try {
      const line = readFileSync(name, 'utf8')
        .split('\n')
        .find((l) => l.trim().startsWith('DATABASE_FILE='));
      if (line) return line.split('=').slice(1).join('=').trim();
    } catch {
      // file không tồn tại thì thử file kế tiếp
    }
  }
  return 'data/app.db';
}

const file = path.resolve(process.cwd(), databaseFile());
const db = new DatabaseSync(file);
const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(email);

if (!user) {
  console.error(`Không tìm thấy ${email} trong ${file}.`);
  console.error('Hãy đăng nhập bằng Google một lần trước để tạo bản ghi.');
  process.exit(1);
}

db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
db.close();

console.log(`${email}: role ${user.role} -> ${role}`);
