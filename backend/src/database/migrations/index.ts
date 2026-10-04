import type { DatabaseService } from '../database.service';
import { applyCategorySeeds } from '../category-seed';
import { CATEGORIES_FROM_SQLITE } from './data/categories-from-sqlite';

export type Migration = {
  /** Tên duy nhất, có tiền tố ngày để sắp đúng thứ tự. Đã deploy thì không đổi tên. */
  name: string;
  up(db: DatabaseService): Promise<void>;
};

/**
 * Migration dữ liệu, chạy đúng một lần mỗi database theo thứ tự trong mảng
 * (ghi lại ở bảng `migrations`). Thêm migration mới vào CUỐI mảng; không sửa
 * migration đã deploy — muốn đổi dữ liệu thì viết migration khác.
 *
 * Bảng/cột do `schema.ts` lo; ở đây là dữ liệu cần có sẵn khi deploy.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    // Toàn bộ danh mục từ bản SQLite cũ: quyền, chức năng, tỉnh/thành phố
    // (34), phường/xã (3321, nhóm theo tỉnh), chuyên mục bài viết, lĩnh vực
    // sản phẩm.
    name: '2026-10-04-001-categories-from-sqlite',
    async up(db) {
      await applyCategorySeeds(db, CATEGORIES_FROM_SQLITE);
    },
  },
];
