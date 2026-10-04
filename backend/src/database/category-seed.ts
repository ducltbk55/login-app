import type { DatabaseService } from './database.service';

/** Chi tiết danh mục viết gọn: [code, name, order, groupDetailCode?]. */
export type CategoryDetailSeed = [
  code: string,
  name: string,
  order: number,
  groupDetailCode?: string,
];

export type CategorySeed = {
  code: string;
  name: string;
  descriptions: string | null;
  order: number;
  status: 'active' | 'inactive';
  /** Code của danh mục nhóm; nhóm phải đứng trước trong cùng danh sách hoặc đã có trong DB. */
  groupCategoryCode: string | null;
  details: CategoryDetailSeed[];
};

const BATCH_SIZE = 500;

export type CategorySeedReport = { categories: number; details: number };

/**
 * Chèn danh mục và chi tiết còn thiếu, nhận diện theo `code`.
 *
 * Bản ghi đã có (kể cả đã được admin sửa tên, đổi thứ tự hay tắt) được giữ
 * nguyên — migration chỉ bổ sung, không bao giờ ghi đè dữ liệu đang dùng.
 */
export async function applyCategorySeeds(
  db: DatabaseService,
  seeds: readonly CategorySeed[],
): Promise<CategorySeedReport> {
  const report: CategorySeedReport = { categories: 0, details: 0 };
  const now = new Date().toISOString();

  for (const seed of seeds) {
    const groupCategoryId = seed.groupCategoryCode
      ? await categoryIdOf(db, seed.groupCategoryCode)
      : null;
    if (seed.groupCategoryCode && groupCategoryId === null) {
      throw new Error(
        `Danh mục nhóm "${seed.groupCategoryCode}" của "${seed.code}" chưa tồn tại`,
      );
    }

    let categoryId = await categoryIdOf(db, seed.code);
    if (categoryId === null) {
      const result = await db.run(
        `INSERT INTO categories
           (code, name, descriptions, \`order\`, status, groupCategoryId,
            createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          seed.code,
          seed.name,
          seed.descriptions,
          seed.order,
          seed.status,
          groupCategoryId,
          now,
          now,
        ],
      );
      categoryId = result.lastInsertId;
      report.categories += 1;
    }

    const existing = new Set(
      (
        await db.all<{ code: string }>(
          'SELECT code FROM category_details WHERE categoryId = ?',
          [categoryId],
        )
      ).map((row) => row.code.toUpperCase()),
    );

    const groupDetails = new Map<string, number>();
    if (groupCategoryId !== null) {
      const rows = await db.all<{ id: number; code: string }>(
        'SELECT id, code FROM category_details WHERE categoryId = ?',
        [groupCategoryId],
      );
      for (const row of rows) groupDetails.set(row.code.toUpperCase(), row.id);
    }

    const missing = seed.details.filter(
      ([code]) => !existing.has(code.toUpperCase()),
    );
    const rows = missing.map(([code, name, order, groupDetailCode]) => {
      let groupDetailId: number | null = null;
      if (groupDetailCode) {
        groupDetailId = groupDetails.get(groupDetailCode.toUpperCase()) ?? null;
        if (groupDetailId === null) {
          throw new Error(
            `Không tìm thấy chi tiết nhóm "${groupDetailCode}" cho ` +
              `"${seed.code}/${code}"`,
          );
        }
      }
      return [
        categoryId,
        code,
        name,
        null,
        order,
        'active',
        groupDetailId,
        now,
        now,
      ];
    });

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await db.run(
        `INSERT INTO category_details
           (categoryId, code, name, descriptions, \`order\`, status,
            groupDetailId, createdAt, updatedAt)
         VALUES ?`,
        [rows.slice(i, i + BATCH_SIZE)],
      );
    }
    report.details += rows.length;
  }

  return report;
}

async function categoryIdOf(
  db: DatabaseService,
  code: string,
): Promise<number | null> {
  const row = await db.get<{ id: number }>(
    'SELECT id FROM categories WHERE code = ?',
    [code],
  );
  return row ? Number(row.id) : null;
}
