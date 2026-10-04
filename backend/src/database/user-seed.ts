import type { DatabaseService } from './database.service';
import type { UserSeed } from './migrations/data/admin-users';

const COLUMNS = [
  'accountId',
  'email',
  'name',
  'image',
  'provider',
  'role',
  'status',
  'createdAt',
  'lastLoginAt',
  'loginCount',
  'phone',
  'gender',
  'birthDate',
  'addressLine',
  'provinceCode',
  'wardCode',
] as const satisfies readonly (keyof UserSeed)[];

/**
 * Chèn tài khoản còn thiếu, nhận diện theo `email`.
 *
 * Tài khoản đã có (kể cả đã đổi role, bị khoá hay sửa hồ sơ) được giữ
 * nguyên — migration chỉ bổ sung, không ghi đè dữ liệu đang dùng.
 */
export async function applyUserSeeds(
  db: DatabaseService,
  seeds: readonly UserSeed[],
): Promise<number> {
  let inserted = 0;

  for (const seed of seeds) {
    const existing = await db.get<{ id: number }>(
      'SELECT id FROM users WHERE email = ?',
      [seed.email],
    );
    if (existing) continue;

    await db.run(
      `INSERT INTO users (${COLUMNS.join(', ')})
       VALUES (${COLUMNS.map(() => '?').join(', ')})`,
      COLUMNS.map((column) => seed[column]),
    );
    inserted++;
  }

  return inserted;
}
