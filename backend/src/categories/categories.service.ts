import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { matchesSearch } from '../common/search';
import { slugify } from '../common/slugify';
import { SqliteService } from '../database/sqlite.service';
import { Category } from './category.entity';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/save-category.dto';

type CategoryRow = Omit<Category, 'isActive'> & { isActive: number };

/** SQLite lưu boolean bằng 0/1 nên phải đổi lại khi đọc ra. */
function toCategory(row: CategoryRow): Category {
  return {
    ...row,
    sortOrder: Number(row.sortOrder),
    isActive: Boolean(row.isActive),
  };
}

@Injectable()
export class CategoriesService {
  constructor(private readonly sqlite: SqliteService) {}

  list(query: ListCategoriesDto = {}): Category[] {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (query.isActive !== undefined) {
      where.push('isActive = ?');
      params.push(query.isActive ? 1 : 0);
    }

    const rows = this.sqlite.db
      .prepare(
        `SELECT * FROM categories
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY sortOrder ASC, name COLLATE NOCASE ASC`,
      )
      .all(...params) as CategoryRow[];

    const items = rows.map(toCategory);
    if (!query.search) return items;

    return items.filter((c) =>
      matchesSearch(query.search ?? '', c.name, c.slug),
    );
  }

  findOne(id: string): Category | null {
    const row = this.sqlite.db
      .prepare('SELECT * FROM categories WHERE id = ?')
      .get(id) as CategoryRow | undefined;
    return row ? toCategory(row) : null;
  }

  findOneOrFail(id: string): Category {
    const category = this.findOne(id);
    if (!category) {
      throw new NotFoundException(`Không tìm thấy danh mục ${id}`);
    }
    return category;
  }

  count(): number {
    const row = this.sqlite.db
      .prepare('SELECT COUNT(*) AS total FROM categories')
      .get() as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  create(dto: CreateCategoryDto): Category {
    const now = new Date().toISOString();
    const slug = this.resolveSlug(dto.slug, dto.name);

    const category: Category = {
      id: randomUUID(),
      name: dto.name,
      slug,
      description: dto.description?.trim() || null,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };

    this.sqlite.db
      .prepare(
        `INSERT INTO categories
           (id, name, slug, description, sortOrder, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        category.id,
        category.name,
        category.slug,
        category.description,
        category.sortOrder,
        category.isActive ? 1 : 0,
        category.createdAt,
        category.updatedAt,
      );

    return category;
  }

  update(id: string, dto: UpdateCategoryDto): Category {
    const existing = this.findOneOrFail(id);
    const name = dto.name ?? existing.name;
    const slug =
      dto.slug !== undefined
        ? this.resolveSlug(dto.slug, name, id)
        : existing.slug;

    const updated: Category = {
      ...existing,
      name,
      slug,
      description:
        dto.description === undefined
          ? existing.description
          : dto.description?.trim() || null,
      sortOrder: dto.sortOrder ?? existing.sortOrder,
      isActive: dto.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    };

    this.sqlite.db
      .prepare(
        `UPDATE categories
            SET name = ?, slug = ?, description = ?, sortOrder = ?,
                isActive = ?, updatedAt = ?
          WHERE id = ?`,
      )
      .run(
        updated.name,
        updated.slug,
        updated.description,
        updated.sortOrder,
        updated.isActive ? 1 : 0,
        updated.updatedAt,
        id,
      );

    return updated;
  }

  remove(id: string): void {
    this.findOneOrFail(id);
    this.sqlite.db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  }

  /** Sinh slug nếu chưa có và bảo đảm không đụng slug của bản ghi khác. */
  private resolveSlug(slug: string | undefined, name: string, id?: string) {
    const value = slug?.trim() || slugify(name);
    if (!value) {
      throw new ConflictException(
        'Không sinh được slug từ name, hãy nhập slug thủ công',
      );
    }

    const clash = this.sqlite.db
      .prepare('SELECT id FROM categories WHERE slug = ? AND id IS NOT ?')
      .get(value, id ?? null) as { id: string } | undefined;

    if (clash) {
      throw new ConflictException(`Slug "${value}" đã được dùng`);
    }
    return value;
  }
}
