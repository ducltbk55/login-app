import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeCode } from '../common/code';
import { matchesSearch } from '../common/search';
import { SqliteService } from '../database/sqlite.service';
import { CategoriesService } from './categories.service';
import { Category, CategoryDetail, CategoryStatus } from './category.entity';
import { ListCategoryDetailsDto } from './dto/list-categories.dto';
import {
  CreateCategoryDetailDto,
  UpdateCategoryDetailDto,
} from './dto/save-category.dto';

type DetailRow = Omit<
  CategoryDetail,
  'id' | 'categoryId' | 'order' | 'status' | 'groupDetailId' | 'group'
> & {
  id: number | bigint;
  categoryId: number | bigint;
  order: number | bigint;
  status: string;
  groupDetailId: number | bigint | null;
  groupCode: string | null;
  groupName: string | null;
};

function toDetail(row: DetailRow): CategoryDetail {
  const groupDetailId =
    row.groupDetailId === null ? null : Number(row.groupDetailId);

  return {
    id: Number(row.id),
    categoryId: Number(row.categoryId),
    code: row.code,
    name: row.name,
    descriptions: row.descriptions,
    order: Number(row.order),
    status: row.status as CategoryStatus,
    groupDetailId,
    group:
      groupDetailId === null || row.groupCode === null
        ? null
        : {
            id: groupDetailId,
            code: row.groupCode,
            name: row.groupName ?? row.groupCode,
          },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** `SELECT` dùng chung, luôn kéo theo thông tin chi tiết nhóm để hiển thị. */
const SELECT_DETAIL = `
  SELECT d.*, g.code AS groupCode, g.name AS groupName
    FROM category_details d
    LEFT JOIN category_details g ON g.id = d.groupDetailId
`;

/**
 * Chi tiết danh mục luôn nằm trong phạm vi một danh mục: mọi thao tác đều nhận
 * `categoryId` và kiểm tra danh mục cha tồn tại trước, nên không thể đọc hay
 * sửa nhầm chi tiết của danh mục khác qua id đoán được.
 */
@Injectable()
export class CategoryDetailsService {
  constructor(
    private readonly sqlite: SqliteService,
    private readonly categories: CategoriesService,
  ) {}

  list(
    categoryId: number,
    query: ListCategoryDetailsDto = {},
  ): CategoryDetail[] {
    this.categories.findOneOrFail(categoryId);

    const where = ['d.categoryId = ?'];
    const params: (string | number)[] = [categoryId];

    if (query.status !== undefined) {
      where.push('d.status = ?');
      params.push(query.status);
    }
    if (query.groupDetailId !== undefined) {
      where.push('d.groupDetailId = ?');
      params.push(query.groupDetailId);
    }

    // Danh mục có phân nhóm thì xếp theo nhóm trước, nhờ vậy các chi tiết cùng
    // nhóm nằm liền nhau trên mọi trang. Danh mục phẳng thì g.* đều NULL nên
    // hai vế đầu không ảnh hưởng gì.
    const rows = this.sqlite.db
      .prepare(
        `${SELECT_DETAIL}
          WHERE ${where.join(' AND ')}
          ORDER BY g."order" ASC, g.name COLLATE NOCASE ASC,
                   d."order" ASC, d.name COLLATE NOCASE ASC`,
      )
      .all(...params) as DetailRow[];

    const items = rows.map(toDetail);
    if (!query.search) return items;

    return items.filter((d) =>
      matchesSearch(query.search ?? '', d.name, d.code),
    );
  }

  findOne(categoryId: number, id: number): CategoryDetail | null {
    const row = this.sqlite.db
      .prepare(`${SELECT_DETAIL} WHERE d.id = ? AND d.categoryId = ?`)
      .get(id, categoryId) as DetailRow | undefined;
    return row ? toDetail(row) : null;
  }

  findOneOrFail(categoryId: number, id: number): CategoryDetail {
    const detail = this.findOne(categoryId, id);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy chi tiết danh mục ${id}`);
    }
    return detail;
  }

  create(categoryId: number, dto: CreateCategoryDetailDto): CategoryDetail {
    const category = this.categories.findOneOrFail(categoryId);
    const groupDetailId = this.resolveGroupDetailId(
      category,
      dto.groupDetailId ?? null,
      true,
    );

    const now = new Date().toISOString();
    const detail = {
      categoryId,
      code: this.resolveCode(categoryId, dto.code, dto.name),
      name: dto.name,
      descriptions: dto.descriptions?.trim() || null,
      order: dto.order ?? 1, // thứ tự hiển thị đánh số từ 1
      status: dto.status ?? 'active',
      groupDetailId,
      createdAt: now,
      updatedAt: now,
    };

    const result = this.sqlite.db
      .prepare(
        `INSERT INTO category_details
           (categoryId, code, name, descriptions, "order", status,
            groupDetailId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        detail.categoryId,
        detail.code,
        detail.name,
        detail.descriptions,
        detail.order,
        detail.status,
        detail.groupDetailId,
        detail.createdAt,
        detail.updatedAt,
      );

    return this.findOneOrFail(categoryId, Number(result.lastInsertRowid));
  }

  update(
    categoryId: number,
    id: number,
    dto: UpdateCategoryDetailDto,
  ): CategoryDetail {
    const category = this.categories.findOneOrFail(categoryId);
    const existing = this.findOneOrFail(categoryId, id);
    const name = dto.name ?? existing.name;

    // Không gửi groupDetailId = giữ nguyên, nhờ vậy nút bật/tắt nhanh vẫn chạy
    // được với chi tiết cũ chưa phân nhóm.
    const groupDetailId =
      dto.groupDetailId === undefined
        ? this.resolveGroupDetailId(category, existing.groupDetailId, false)
        : this.resolveGroupDetailId(category, dto.groupDetailId, true);

    const updated = {
      code:
        dto.code !== undefined
          ? this.resolveCode(categoryId, dto.code, name, id)
          : existing.code,
      name,
      descriptions:
        dto.descriptions === undefined
          ? existing.descriptions
          : dto.descriptions?.trim() || null,
      order: dto.order ?? existing.order,
      status: dto.status ?? existing.status,
      groupDetailId,
      updatedAt: new Date().toISOString(),
    };

    this.sqlite.db
      .prepare(
        `UPDATE category_details
            SET code = ?, name = ?, descriptions = ?, "order" = ?,
                status = ?, groupDetailId = ?, updatedAt = ?
          WHERE id = ? AND categoryId = ?`,
      )
      .run(
        updated.code,
        updated.name,
        updated.descriptions,
        updated.order,
        updated.status,
        updated.groupDetailId,
        updated.updatedAt,
        id,
        categoryId,
      );

    return this.findOneOrFail(categoryId, id);
  }

  remove(categoryId: number, id: number): void {
    this.findOneOrFail(categoryId, id);

    const row = this.sqlite.db
      .prepare(
        'SELECT COUNT(*) AS total FROM category_details WHERE groupDetailId = ?',
      )
      .get(id) as { total: number | bigint } | undefined;

    const total = Number(row?.total ?? 0);
    if (total > 0) {
      throw new ConflictException(
        `Chi tiết này đang là nhóm của ${total} chi tiết khác. ` +
          'Hãy chuyển chúng sang nhóm khác trước.',
      );
    }

    // Chuyên mục bài viết cũng là chi tiết danh mục. Bảng `articles` có khoá
    // ngoại trỏ tới đây, nên không chặn trước thì SQLite ném "FOREIGN KEY
    // constraint failed" — đúng nhưng người dùng không hiểu gì. Truy vấn
    // thẳng bảng thay vì gọi ArticlesService để khỏi tạo vòng phụ thuộc
    // module; vẫn chung một kết nối nên vẫn nằm trong transaction.
    const articles = this.sqlite.db
      .prepare(
        'SELECT COUNT(*) AS total FROM articles WHERE categoryDetailId = ?',
      )
      .get(id) as { total: number | bigint } | undefined;

    const articleCount = Number(articles?.total ?? 0);
    if (articleCount > 0) {
      throw new ConflictException(
        `Chuyên mục này đang có ${articleCount} bài viết. ` +
          'Hãy chuyển các bài sang chuyên mục khác hoặc xoá chúng trước.',
      );
    }

    this.sqlite.db
      .prepare('DELETE FROM category_details WHERE id = ? AND categoryId = ?')
      .run(id, categoryId);
  }

  /**
   * Đối chiếu nhóm của chi tiết với cấu hình của danh mục cha.
   *
   * `required` = true khi người dùng thực sự gửi giá trị lên (tạo mới, hoặc
   * sửa có kèm trường này): lúc đó danh mục có phân nhóm thì bắt buộc chọn.
   * Khi chỉ cập nhật trường khác thì giữ nguyên giá trị cũ, kể cả khi nó còn
   * trống do dữ liệu tạo từ trước lúc có tính năng này.
   */
  private resolveGroupDetailId(
    category: Category,
    groupDetailId: number | null,
    required: boolean,
  ): number | null {
    if (category.groupCategoryId === null) {
      if (groupDetailId !== null) {
        throw new BadRequestException(
          `Danh mục "${category.name}" không phân nhóm nên không nhận groupDetailId`,
        );
      }
      return null;
    }

    if (groupDetailId === null) {
      if (!required) return null;
      throw new BadRequestException(
        `Danh mục "${category.name}" có phân nhóm nên phải chọn nhóm cho chi tiết`,
      );
    }

    const group = this.sqlite.db
      .prepare('SELECT categoryId FROM category_details WHERE id = ?')
      .get(groupDetailId) as { categoryId: number | bigint } | undefined;

    if (!group || Number(group.categoryId) !== category.groupCategoryId) {
      throw new BadRequestException(
        `Nhóm ${groupDetailId} không thuộc danh mục nhóm đã chọn`,
      );
    }

    return groupDetailId;
  }

  /**
   * Mã chỉ cần duy nhất trong phạm vi một danh mục — hai danh mục khác nhau
   * vẫn được dùng chung một mã chi tiết.
   */
  private resolveCode(
    categoryId: number,
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
      .prepare(
        `SELECT id FROM category_details
          WHERE categoryId = ? AND code = ? AND id IS NOT ?`,
      )
      .get(categoryId, value, id ?? null) as { id: number } | undefined;

    if (clash) {
      throw new ConflictException(
        `Mã "${value}" đã được dùng trong danh mục này`,
      );
    }
    return value;
  }
}
