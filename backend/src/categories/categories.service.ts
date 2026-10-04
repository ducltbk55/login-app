import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeCode } from '../common/code';
import { matchesSearch } from '../common/search';
import { DatabaseService } from '../database/database.service';
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
  id: number;
  order: number;
  status: string;
  groupCategoryId: number | null;
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
  constructor(private readonly db: DatabaseService) {}

  /** Kèm `detailCount` và danh mục nhóm để bảng danh sách khỏi gọi thêm vòng. */
  async list(query: ListCategoriesDto = {}): Promise<CategorySummary[]> {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (query.status !== undefined) {
      where.push('c.status = ?');
      params.push(query.status);
    }

    const rows = await this.db.all<
      CategoryRow & {
        detailCount: number;
        groupCode: string | null;
        groupName: string | null;
      }
    >(
      `SELECT c.*,
              (SELECT COUNT(*) FROM category_details d
                WHERE d.categoryId = c.id) AS detailCount,
              g.code AS groupCode,
              g.name AS groupName
         FROM categories c
         LEFT JOIN categories g ON g.id = c.groupCategoryId
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.\`order\` ASC, c.name ASC`,
      params,
    );

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

  async findOne(id: number): Promise<Category | null> {
    const row = await this.db.get<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [id],
    );
    return row ? toCategory(row) : null;
  }

  async findOneOrFail(id: number): Promise<Category> {
    const category = await this.findOne(id);
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }
    return category;
  }

  /** Dạng gọn để nhúng vào bản ghi khác. */
  async groupRef(id: number): Promise<GroupRef> {
    const category = await this.findOneOrFail(id);
    return { id: category.id, code: category.code, name: category.name };
  }

  async count(): Promise<number> {
    const row = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM categories',
    );
    return Number(row?.total ?? 0);
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const now = new Date().toISOString();
    const groupCategoryId = dto.groupCategoryId ?? null;
    if (groupCategoryId !== null) {
      await this.assertUsableAsGroup(groupCategoryId);
    }

    const category: Omit<Category, 'id'> = {
      code: await this.resolveCode(dto.code, dto.name),
      name: dto.name,
      descriptions: dto.descriptions?.trim() || null,
      order: dto.order ?? 1, // thứ tự hiển thị đánh số từ 1
      status: dto.status ?? 'active',
      groupCategoryId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.db.run(
      `INSERT INTO categories
         (code, name, descriptions, \`order\`, status, groupCategoryId,
          createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        category.code,
        category.name,
        category.descriptions,
        category.order,
        category.status,
        category.groupCategoryId,
        category.createdAt,
        category.updatedAt,
      ],
    );

    return { ...category, id: result.lastInsertId };
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.findOneOrFail(id);
    const name = dto.name ?? existing.name;

    const groupCategoryId =
      dto.groupCategoryId === undefined
        ? existing.groupCategoryId
        : dto.groupCategoryId;

    if (
      groupCategoryId !== null &&
      groupCategoryId !== existing.groupCategoryId
    ) {
      await this.assertUsableAsGroup(groupCategoryId, id);
    }

    const updated: Category = {
      ...existing,
      code:
        dto.code !== undefined
          ? await this.resolveCode(dto.code, name, id)
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

    return this.db.transaction(async () => {
      await this.db.run(
        `UPDATE categories
            SET code = ?, name = ?, descriptions = ?, \`order\` = ?,
                status = ?, groupCategoryId = ?, updatedAt = ?
          WHERE id = ?`,
        [
          updated.code,
          updated.name,
          updated.descriptions,
          updated.order,
          updated.status,
          updated.groupCategoryId,
          updated.updatedAt,
          id,
        ],
      );

      // Đổi danh mục nhóm thì nhóm cũ của từng chi tiết không còn hợp lệ.
      if (groupCategoryId !== existing.groupCategoryId) {
        await this.db.run(
          'UPDATE category_details SET groupDetailId = NULL WHERE categoryId = ?',
          [id],
        );
      }

      return updated;
    });
  }

  /** Khoá ngoại ON DELETE CASCADE nên chi tiết của danh mục bị xoá theo. */
  async remove(id: number): Promise<void> {
    await this.findOneOrFail(id);

    const users = await this.db.all<{ name: string }>(
      `SELECT name FROM categories
        WHERE groupCategoryId = ?
        ORDER BY name`,
      [id],
    );

    if (users.length > 0) {
      throw new ConflictException(
        `Danh mục này đang được dùng làm nhóm cho: ${users
          .map((u) => `"${u.name}"`)
          .join(', ')}. Hãy bỏ phân nhóm ở đó trước.`,
      );
    }

    await this.db.run('DELETE FROM categories WHERE id = ?', [id]);
  }

  /**
   * Danh mục nhóm phải tồn tại, không phải chính nó và không tạo thành vòng
   * (A lấy B làm nhóm, B lại lấy A).
   */
  private async assertUsableAsGroup(
    groupCategoryId: number,
    selfId?: number,
  ): Promise<void> {
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

      const current: Category = await this.findOneOrFail(cursor);
      cursor = current.groupCategoryId;
    }
  }

  /** Sinh mã nếu chưa có và bảo đảm không trùng mã của danh mục khác. */
  private async resolveCode(
    code: string | undefined,
    name: string,
    id?: number,
  ): Promise<string> {
    const value = normalizeCode(code?.trim() || name);
    if (!value) {
      throw new ConflictException(
        'Không sinh được code từ name, hãy nhập code thủ công',
      );
    }

    // `<=>` là so sánh an toàn với NULL của MySQL (tương đương `IS` của SQLite).
    const clash = await this.db.get<{ id: number }>(
      'SELECT id FROM categories WHERE code = ? AND NOT (id <=> ?)',
      [value, id ?? null],
    );

    if (clash) {
      throw new ConflictException(`Mã "${value}" đã được dùng`);
    }
    return value;
  }
}
