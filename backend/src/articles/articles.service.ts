import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ARTICLE_CATEGORY_CODE } from '../common/article-categories';
import { matchesSearch } from '../common/search';
import { slugify } from '../common/slugify';
import { DatabaseService } from '../database/database.service';
import {
  isBlankArticleHtml,
  normalizeArticleContent,
  textOfHtml,
} from './article-content';
import {
  readingMinutesOf,
  type Article,
  type ArticleStatus,
} from './article.entity';
import { ListArticlesDto } from './dto/list-articles.dto';
import { CreateArticleDto, UpdateArticleDto } from './dto/save-article.dto';

type ArticleRow = {
  id: number;
  categoryDetailId: number;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  coverImage: string | null;
  author: string;
  publishedAt: string | null;
  status: string;
  featured: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  categoryCode: string | null;
  categoryName: string | null;
};

@Injectable()
export class ArticlesService {
  constructor(private readonly db: DatabaseService) {}

  private toArticle(row: ArticleRow, now: string): Article {
    const publishedAt = row.publishedAt;
    const status = row.status as ArticleStatus;
    const content = normalizeArticleContent(row.content);

    return {
      id: Number(row.id),
      categoryDetailId: Number(row.categoryDetailId),
      category:
        row.categoryCode === null
          ? null
          : {
              id: Number(row.categoryDetailId),
              code: row.categoryCode,
              name: row.categoryName ?? row.categoryCode,
            },
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      content,
      coverImage: row.coverImage,
      author: row.author,
      publishedAt,
      status,
      featured: Number(row.featured) === 1,
      viewCount: Number(row.viewCount),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      readingMinutes: readingMinutesOf(textOfHtml(content)),
      live:
        status === 'published' && publishedAt !== null && publishedAt <= now,
    };
  }

  /**
   * HTML từ editor → HTML đã lọc, sẵn sàng lưu. Kiểm tra rỗng SAU khi lọc:
   * `<p>&nbsp;</p>` hay một thẻ bị lọc sạch thì vẫn là không có nội dung.
   */
  private cleanContent(content: string): string {
    const html = normalizeArticleContent(content);
    if (isBlankArticleHtml(html)) {
      throw new BadRequestException('Nội dung không được để trống');
    }
    return html;
  }

  /** Luôn kèm chuyên mục; sắp bài mới nhất lên trước. */
  private selectAll(): string {
    return `SELECT a.*, d.code AS categoryCode, d.name AS categoryName
              FROM articles a
              LEFT JOIN category_details d ON d.id = a.categoryDetailId`;
  }

  async list(query: ListArticlesDto = {}): Promise<Article[]> {
    const now = new Date().toISOString();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (query.status !== undefined) {
      where.push('a.status = ?');
      params.push(query.status);
    }
    if (query.categoryDetailId !== undefined) {
      where.push('a.categoryDetailId = ?');
      params.push(query.categoryDetailId);
    }
    if (query.featured !== undefined) {
      where.push('a.featured = ?');
      params.push(query.featured ? 1 : 0);
    }
    if (query.live === true) {
      where.push("a.status = 'published'");
      where.push('a.publishedAt IS NOT NULL');
      where.push('a.publishedAt <= ?');
      params.push(now);
    }

    const rows = await this.db.all<ArticleRow>(
      `${this.selectAll()}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY a.featured DESC,
                COALESCE(a.publishedAt, a.createdAt) DESC,
                a.id DESC`,
      params,
    );

    const items = rows.map((row) => this.toArticle(row, now));
    if (!query.search) return items;

    // Lọc trong JS để bỏ dấu thống nhất với các module khác — xem common/search.ts
    return items.filter((article) =>
      matchesSearch(
        query.search ?? '',
        article.title,
        article.summary ?? '',
        article.author,
      ),
    );
  }

  async findOne(id: number): Promise<Article | null> {
    const row = await this.db.get<ArticleRow>(
      `${this.selectAll()} WHERE a.id = ?`,
      [id],
    );
    return row ? this.toArticle(row, new Date().toISOString()) : null;
  }

  async findOneOrFail(id: number): Promise<Article> {
    const article = await this.findOne(id);
    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết ${id}`);
    }
    return article;
  }

  async findBySlug(slug: string): Promise<Article | null> {
    const row = await this.db.get<ArticleRow>(
      `${this.selectAll()} WHERE a.slug = ?`,
      [slug],
    );
    return row ? this.toArticle(row, new Date().toISOString()) : null;
  }

  async count(): Promise<number> {
    const row = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM articles',
    );
    return Number(row?.total ?? 0);
  }

  async create(dto: CreateArticleDto): Promise<Article> {
    return this.db.transaction(async () => {
      await this.assertCategory(dto.categoryDetailId);

      const now = new Date().toISOString();
      const status = dto.status ?? 'draft';
      const slug = await this.resolveSlug(dto.slug, dto.title);

      const result = await this.db.run(
        `INSERT INTO articles
           (categoryDetailId, slug, title, summary, content, coverImage,
            author, publishedAt, status, featured, viewCount,
            createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          dto.categoryDetailId,
          slug,
          dto.title,
          dto.summary ?? null,
          this.cleanContent(dto.content),
          dto.coverImage ?? null,
          dto.author,
          this.resolvePublishedAt(dto.publishedAt ?? null, status, now),
          status,
          dto.featured ? 1 : 0,
          now,
          now,
        ],
      );

      return this.findOneOrFail(result.lastInsertId);
    });
  }

  async update(id: number, dto: UpdateArticleDto): Promise<Article> {
    return this.db.transaction(async () => {
      const current = await this.findOneOrFail(id);

      if (dto.categoryDetailId !== undefined) {
        await this.assertCategory(dto.categoryDetailId);
      }

      const now = new Date().toISOString();
      const status = dto.status ?? current.status;
      const slug =
        dto.slug === undefined
          ? current.slug
          : await this.resolveSlug(dto.slug, dto.title ?? current.title, id);

      // Không gửi trường ngày thì giữ nguyên ngày cũ. Quy tắc "published mà
      // chưa có ngày thì lấy bây giờ" nằm trong resolvePublishedAt, nên nó áp
      // dụng cho cả hai đường.
      const publishedAt = this.resolvePublishedAt(
        dto.publishedAt !== undefined ? dto.publishedAt : current.publishedAt,
        status,
        now,
      );

      await this.db.run(
        `UPDATE articles
            SET categoryDetailId = ?, slug = ?, title = ?, summary = ?,
                content = ?, coverImage = ?, author = ?, publishedAt = ?,
                status = ?, featured = ?, updatedAt = ?
          WHERE id = ?`,
        [
          dto.categoryDetailId ?? current.categoryDetailId,
          slug,
          dto.title ?? current.title,
          dto.summary !== undefined ? dto.summary : current.summary,
          dto.content === undefined
            ? current.content
            : this.cleanContent(dto.content),
          dto.coverImage !== undefined ? dto.coverImage : current.coverImage,
          dto.author ?? current.author,
          publishedAt,
          status,
          (dto.featured ?? current.featured) ? 1 : 0,
          now,
          id,
        ],
      );

      return this.findOneOrFail(id);
    });
  }

  async remove(id: number): Promise<void> {
    await this.findOneOrFail(id);
    await this.db.run('DELETE FROM articles WHERE id = ?', [id]);
  }

  /** Đếm lượt xem ở trang ngoài. Không đụng `updatedAt`: đây không phải sửa bài. */
  async recordView(slug: string): Promise<void> {
    await this.db.run(
      'UPDATE articles SET viewCount = viewCount + 1 WHERE slug = ?',
      [slug],
    );
  }

  /** Số bài theo từng chuyên mục, dùng cho bộ lọc ở trang ngoài. */
  async countsByCategory(onlyLive = false): Promise<Record<number, number>> {
    const now = new Date().toISOString();
    const rows = await this.db.all<{ id: number; total: number }>(
      `SELECT categoryDetailId AS id, COUNT(*) AS total
         FROM articles
        ${
          onlyLive
            ? "WHERE status = 'published' AND publishedAt IS NOT NULL AND publishedAt <= ?"
            : ''
        }
        GROUP BY categoryDetailId`,
      onlyLive ? [now] : [],
    );

    return Object.fromEntries(
      rows.map((row) => [Number(row.id), Number(row.total)]),
    );
  }

  /**
   * Chuyên mục phải là chi tiết đang bật của đúng danh mục `DM_CHUYEN_MUC`.
   * Truy vấn thẳng bảng thay vì phụ thuộc CategoriesModule — cùng một database,
   * và tránh vòng phụ thuộc giữa hai module.
   */
  private async assertCategory(categoryDetailId: number): Promise<void> {
    const row = await this.db.get<{ status: string }>(
      `SELECT d.status AS status
         FROM category_details d
         JOIN categories c ON c.id = d.categoryId
        WHERE d.id = ? AND c.code = ?`,
      [categoryDetailId, ARTICLE_CATEGORY_CODE],
    );

    if (!row) {
      throw new BadRequestException(
        `Chuyên mục không hợp lệ: phải là một chi tiết của danh mục ${ARTICLE_CATEGORY_CODE}`,
      );
    }
    if (row.status !== 'active') {
      throw new BadRequestException(
        'Chuyên mục này đang tắt, không gán bài mới vào được',
      );
    }
  }

  /**
   * `published` mà chưa có ngày thì lấy bây giờ — không chọn ngày nghĩa là
   * "đăng luôn". Các trạng thái khác giữ nguyên giá trị được gửi lên, kể cả
   * null, để admin đặt lịch trước rồi mới bật xuất bản.
   */
  private resolvePublishedAt(
    value: string | null,
    status: ArticleStatus,
    now: string,
  ): string | null {
    if (value !== null) return new Date(value).toISOString();
    return status === 'published' ? now : null;
  }

  /**
   * Slug phải duy nhất vì nó là URL của bài. Trùng thì nối thêm `-2`, `-3`...
   * thay vì báo lỗi — hai bài cùng tiêu đề là chuyện bình thường.
   */
  private async resolveSlug(
    requested: string | undefined,
    title: string,
    selfId?: number,
  ): Promise<string> {
    const base =
      (requested && slugify(requested)) || slugify(title) || 'bai-viet';

    for (let suffix = 1; ; suffix += 1) {
      const candidate = suffix === 1 ? base : `${base}-${suffix}`;
      const clash = await this.db.get<{ id: number }>(
        'SELECT id FROM articles WHERE slug = ?',
        [candidate],
      );

      if (!clash || (selfId !== undefined && Number(clash.id) === selfId)) {
        return candidate;
      }
    }
  }
}
