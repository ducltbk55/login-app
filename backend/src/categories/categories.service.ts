import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeCode } from '../common/code';
import { matchesSearch } from '../common/search';
import { SqliteService } from '../database/sqlite.service';
import {
  Category,
  CategoryStatus,
  CategorySummary,
  GroupRef,
} from './category.entity';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/save-category.dto';

type CategoryRow = Omit<
  Category,
  'id' | 'order' | 'status' | 'groupCategoryId'
> & {
  id: number | bigint;
  order: number | bigint;
  status: string;
  groupCategoryId: number | bigint | null;
};

function toCategory(row: CategoryRow): Category {
  return {
    ...row,
    id: Number(row.id),
    order: Number(row.order),
    status: row.status as CategoryStatus,
    groupCategoryId:
      row.groupCategoryId === null ? null : Number(row.groupCategoryId),
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly sqlite: SqliteService) {}

  /** Kèm `detailCount` và danh mục nhóm để bảng danh sách khỏi gọi thêm vòng. */
  list(query: ListCategoriesDto = {}): CategorySummary[] {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (query.status !== undefined) {
      where.push('c.status = ?');
      params.push(query.status);
    }

    const rows = this.sqlite.db
      .prepare(
        `SELECT c.*,
                (SELECT COUNT(*) FROM category_details d
                  WHERE d.categoryId = c.id) AS detailCount,
                g.code AS groupCode,
                g.name AS groupName
           FROM categories c
           LEFT JOIN categories g ON g.id = c.groupCategoryId
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY c."order" ASC, c.name COLLATE NOCASE ASC`,
      )
      .all(...params) as (CategoryRow & {
      detailCount: number | bigint;
      groupCode: string | null;
      groupName: string | null;
    })[];

    const items = rows.map((row) => {
      const category = toCategory(row);
      return {
        ...category,
        detailCount: Number(row.detailCount),
        groupCategory:
          category.groupCategoryId === null || row.groupCode === null
            ? null
            : {
                id: category.groupCategoryId,
                code: row.groupCode,
                name: row.groupName ?? row.groupCode,
              },
      };
    });

    if (!query.search) return items;

    return items.filter((c) =>
      matchesSearch(query.search ?? '', c.name, c.code),
    );
  }

  findOne(id: number): Category | null {
    const row = this.sqlite.db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(id) as CategoryRow | undefined;
    return row ? toCategory(row) : null;
  }

  findOneOrFail(id: number): Category {
    const category = this.findOne(id);
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }
    return category;
  }

  /** Dạng gọn để nhúng vào bản ghi khác. */
  groupRef(id: number): GroupRef {
    const category = this.findOneOrFail(id);
    return { id: category.id, code: category.code, name: category.name };
  }

  count(): number {
    const row = this.sqlite.db
      .prepare('SELECT COUNT(*) AS total FROM categories')
      .get() as { total: number | bigint } | undefined;
    return Number(row?.total ?? 0);
  }

  create(dto: CreateCategoryDto): Category {
    const now = new Date().toISOString();
    const groupCategoryId = dto.groupCategoryId ?? null;
    if (groupCategoryId !== null) this.assertUsableAsGroup(groupCategoryId);

    const category: Omit<Category, 'id'> = {
      code: this.resolveCode(dto.code, dto.name),
      name: dto.name,
      descriptions: dto.descriptions?.trim() || null,
      order: dto.order ?? 1, // thứ tự hiển thị đánh số từ 1
      status: dto.status ?? 'active',
      groupCategoryId,
      createdAt: now,
      updatedAt: now,
    };

    const result = this.sqlite.db
      .prepare(
        `INSERT INTO categories
           (code, name, descriptions, "order", status, groupCategoryId,
            createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        category.code,
        category.name,
        category.descriptions,
        category.order,
        category.status,
        category.groupCategoryId,
        category.createdAt,
        category.updatedAt,
      );

    return { ...category, id: Number(result.lastInsertRowid) };
  }

  update(id: number, dto: UpdateCategoryDto): Category {
    const existing = this.findOneOrFail(id);
    const name = dto.name ?? existing.name;

    const groupCategoryId =
      dto.groupCategoryId === undefined
        ? existing.groupCategoryId
        : dto.groupCategoryId;

    if (
      groupCategoryId !== null &&
      groupCategoryId !== existing.groupCategoryId
    ) {
      this.assertUsableAsGroup(groupCategoryId, id);
    }

    const updated: Category = {
      ...existing,
      code:
        dto.code !== undefined
          ? this.resolveCode(dto.code, name, id)
          : existing.code,
      name,
      descriptions:
        dto.descriptions === undefined
          ? existing.descriptions
          : dto.descriptions?.trim() || null,
      order: dto.order ?? existing.order,
      status: dto.status ?? existing.status,
      groupCategoryId,
      updatedAt: new Date().toISOString(),
    };

    return this.sqlite.transaction(() => {
      this.sqlite.db
        .prepare(
          `UPDATE categories
              SET code = ?, name = ?, descriptions = ?, "order" = ?,
                  status = ?, groupCategoryId = ?, updatedAt = ?
            WHERE id = ?`,
        )
        .run(
          updated.code,
          updated.name,
          updated.descriptions,
          updated.order,
          updated.status,
          updated.groupCategoryId,
          updated.updatedAt,
          id,
        );

      // Đổi danh mục nhóm thì nhóm cũ của từng chi tiết không còn hợp lệ.
      if (groupCategoryId !== existing.groupCategoryId) {
        this.sqlite.db
          .prepare(
            'UPDATE category_details SET groupDetailId = NULL WHERE categoryId = ?',
          )
          .run(id);
      }

      return updated;
    });
  }

  /** Khoá ngoại ON DELETE CASCADE nên chi tiết của danh mục bị xoá theo. */
  remove(id: number): void {
    this.findOneOrFail(id);

    const users = this.sqlite.db
      .prepare(
        `SELECT name FROM categories
          WHERE groupCategoryId = ?
          ORDER BY name COLLATE NOCASE`,
      )
      .all(id) as { name: string }[];

    if (users.length > 0) {
      throw new ConflictException(
        `Danh mục này đang được dùng làm nhóm cho: ${users
          .map((u) => `"${u.name}"`)
          .join(', ')}. Hãy bỏ phân nhóm ở đó trước.`,
      );
    }

    this.sqlite.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }

  /**
   * Danh mục nhóm phải tồn tại, không phải chính nó và không tạo thành vòng
   * (A lấy B làm nhóm, B lại lấy A).
   */
  private assertUsableAsGroup(groupCategoryId: number, selfId?: number): void {
    if (selfId !== undefined && groupCategoryId === selfId) {
      throw new ConflictException(
        'Danh mục không thể lấy chính nó làm danh mục nhóm',
      );
    }

    let cursor: number | null = groupCategoryId;
    const seen = new Set<number>();

    while (cursor !== null) {
      if (selfId !== undefined && cursor === selfId) {
        throw new ConflictException(
          'Phân nhóm bị lặp vòng: danh mục kia đang lấy danh mục này làm nhóm',
        );
      }
      if (seen.has(cursor)) break; // vòng có sẵn trong DB, không để treo vòng lặp
      seen.add(cursor);

      cursor = this.findOneOrFail(cursor).groupCategoryId;
    }
  }

  /** Sinh mã nếu chưa có và bảo đảm không trùng mã của danh mục khác. */
  private resolveCode(
    code: string | undefined,
    name: string,
    id?: number,
  ): string {
    const value = normalizeCode(code?.trim() || name);
    if (!value) {
      throw new ConflictException(
        'Không sinh được code từ name, hãy nhập code thủ công',
      );
    }

    const clash = this.sqlite.db
      .prepare('SELECT id FROM categories WHERE code = ? AND id IS NOT ?')
      .get(value, id ?? null) as { id: number } | undefined;

    if (clash) {
      throw new ConflictException(`Mã "${value}" đã được dùng`);
    }
    return value;
  }
}
