import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { normalizeCode } from '../common/code';
import { matchesSearch } from '../common/search';
import { DatabaseService } from '../database/database.service';
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
  id: number;
  categoryId: number;
  order: number;
  status: string;
  groupDetailId: number | null;
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
    private readonly db: DatabaseService,
    private readonly categories: CategoriesService,
  ) {}

  async list(
    categoryId: number,
    query: ListCategoryDetailsDto = {},
  ): Promise<CategoryDetail[]> {
    await this.categories.findOneOrFail(categoryId);

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
    const rows = await this.db.all<DetailRow>(
      `${SELECT_DETAIL}
        WHERE ${where.join(' AND ')}
        ORDER BY g.\`order\` ASC, g.name ASC,
                 d.\`order\` ASC, d.name ASC`,
      params,
    );

    const items = rows.map(toDetail);
    if (!query.search) return items;

    return items.filter((d) =>
      matchesSearch(query.search ?? '', d.name, d.code),
    );
  }

  async findOne(
    categoryId: number,
    id: number,
  ): Promise<CategoryDetail | null> {
    const row = await this.db.get<DetailRow>(
      `${SELECT_DETAIL} WHERE d.id = ? AND d.categoryId = ?`,
      [id, categoryId],
    );
    return row ? toDetail(row) : null;
  }

  async findOneOrFail(categoryId: number, id: number): Promise<CategoryDetail> {
    const detail = await this.findOne(categoryId, id);
    if (!detail) {
      throw new NotFoundException(`Không tìm thấy chi tiết danh mục ${id}`);
    }
    return detail;
  }

  async create(
    categoryId: number,
    dto: CreateCategoryDetailDto,
  ): Promise<CategoryDetail> {
    const category = await this.categories.findOneOrFail(categoryId);
    const groupDetailId = await this.resolveGroupDetailId(
      category,
      dto.groupDetailId ?? null,
      true,
    );

    const now = new Date().toISOString();
    const detail = {
      categoryId,
      code: await this.resolveCode(categoryId, dto.code, dto.name),
      name: dto.name,
      descriptions: dto.descriptions?.trim() || null,
      order: dto.order ?? 1, // thứ tự hiển thị đánh số từ 1
      status: dto.status ?? 'active',
      groupDetailId,
      createdAt: now,
      updatedAt: now,
    };

    const result = await this.db.run(
      `INSERT INTO category_details
         (categoryId, code, name, descriptions, \`order\`, status,
          groupDetailId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        detail.categoryId,
        detail.code,
        detail.name,
        detail.descriptions,
        detail.order,
        detail.status,
        detail.groupDetailId,
        detail.createdAt,
        detail.updatedAt,
      ],
    );

    return this.findOneOrFail(categoryId, result.lastInsertId);
  }

  async update(
    categoryId: number,
    id: number,
    dto: UpdateCategoryDetailDto,
  ): Promise<CategoryDetail> {
    const category = await this.categories.findOneOrFail(categoryId);
    const existing = await this.findOneOrFail(categoryId, id);
    const name = dto.name ?? existing.name;

    // Không gửi groupDetailId = giữ nguyên, nhờ vậy nút bật/tắt nhanh vẫn chạy
    // được với chi tiết cũ chưa phân nhóm.
    const groupDetailId =
      dto.groupDetailId === undefined
        ? await this.resolveGroupDetailId(
            category,
            existing.groupDetailId,
            false,
          )
        : await this.resolveGroupDetailId(category, dto.groupDetailId, true);

    const updated = {
      code:
        dto.code !== undefined
          ? await this.resolveCode(categoryId, dto.code, name, id)
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

    await this.db.run(
      `UPDATE category_details
          SET code = ?, name = ?, descriptions = ?, \`order\` = ?,
              status = ?, groupDetailId = ?, updatedAt = ?
        WHERE id = ? AND categoryId = ?`,
      [
        updated.code,
        updated.name,
        updated.descriptions,
        updated.order,
        updated.status,
        updated.groupDetailId,
        updated.updatedAt,
        id,
        categoryId,
      ],
    );

    return this.findOneOrFail(categoryId, id);
  }

  async remove(categoryId: number, id: number): Promise<void> {
    await this.findOneOrFail(categoryId, id);

    const row = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM category_details WHERE groupDetailId = ?',
      [id],
    );

    const total = Number(row?.total ?? 0);
    if (total > 0) {
      throw new ConflictException(
        `Chi tiết này đang là nhóm của ${total} chi tiết khác. ` +
          'Hãy chuyển chúng sang nhóm khác trước.',
      );
    }

    // Chuyên mục bài viết cũng là chi tiết danh mục. Bảng `articles` có khoá
    // ngoại trỏ tới đây, nên không chặn trước thì MySQL ném lỗi vi phạm khoá
    // ngoại — đúng nhưng người dùng không hiểu gì. Truy vấn thẳng bảng thay
    // vì gọi ArticlesService để khỏi tạo vòng phụ thuộc module; DatabaseService
    // tự dùng kết nối của transaction đang chạy (nếu có).
    const articles = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM articles WHERE categoryDetailId = ?',
      [id],
    );

    const articleCount = Number(articles?.total ?? 0);
    if (articleCount > 0) {
      throw new ConflictException(
        `Chuyên mục này đang có ${articleCount} bài viết. ` +
          'Hãy chuyển các bài sang chuyên mục khác hoặc xoá chúng trước.',
      );
    }

    // Lĩnh vực sản phẩm: cùng lý do như chuyên mục bài viết ở trên.
    const products = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM products WHERE categoryDetailId = ?',
      [id],
    );

    const productCount = Number(products?.total ?? 0);
    if (productCount > 0) {
      throw new ConflictException(
        `Lĩnh vực này đang có ${productCount} sản phẩm. ` +
          'Hãy chuyển các sản phẩm sang lĩnh vực khác hoặc xoá chúng trước.',
      );
    }

    await this.db.run(
      'DELETE FROM category_details WHERE id = ? AND categoryId = ?',
      [id, categoryId],
    );
  }

  /**
   * Đối chiếu nhóm của chi tiết với cấu hình của danh mục cha.
   *
   * `required` = true khi người dùng thực sự gửi giá trị lên (tạo mới, hoặc
   * sửa có kèm trường này): lúc đó danh mục có phân nhóm thì bắt buộc chọn.
   * Khi chỉ cập nhật trường khác thì giữ nguyên giá trị cũ, kể cả khi nó còn
   * trống do dữ liệu tạo từ trước lúc có tính năng này.
   */
  private async resolveGroupDetailId(
    category: Category,
    groupDetailId: number | null,
    required: boolean,
  ): Promise<number | null> {
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

    const group = await this.db.get<{ categoryId: number }>(
      'SELECT categoryId FROM category_details WHERE id = ?',
      [groupDetailId],
    );

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
  private async resolveCode(
    categoryId: number,
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

    const clash = await this.db.get<{ id: number }>(
      `SELECT id FROM category_details
        WHERE categoryId = ? AND code = ? AND NOT (id <=> ?)`,
      [categoryId, value, id ?? null],
    );

    if (clash) {
      throw new ConflictException(
        `Mã "${value}" đã được dùng trong danh mục này`,
      );
    }
    return value;
  }
}
