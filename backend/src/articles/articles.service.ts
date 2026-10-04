import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ARTICLE_CATEGORY_CODE } from '../common/article-categories';
import { matchesSearch } from '../common/search';
import { slugify } from '../common/slugify';
import { SqliteService } from '../database/sqlite.service';
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
  id: number | bigint;
  categoryDetailId: number | bigint;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  coverImage: string | null;
  author: string;
  publishedAt: string | null;
  status: string;
  featured: number | bigint;
  viewCount: number | bigint;
  createdAt: string;
  updatedAt: string;
  categoryCode: string | null;
  categoryName: string | null;
};

@Injectable()
export class ArticlesService {
  constructor(private readonly sqlite: SqliteService) {}

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

  list(query: ListArticlesDto = {}): Article[] {
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

    const rows = this.sqlite.db
      .prepare(
        `${this.selectAll()}
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY a.featured DESC,
                  COALESCE(a.publishedAt, a.createdAt) DESC,
                  a.id DESC`,
      )
      .all(...params) as ArticleRow[];

    const items = rows.map((row) => this.toArticle(row, now));
    if (!query.search) return items;

    // Lọc trong JS vì SQLite dựng sẵn không bỏ dấu được — xem common/search.ts
    return items.filter((article) =>
      matchesSearch(
        query.search ?? '',
        article.title,
        article.summary ?? '',
        article.author,
      ),
    );
  }

  findOne(id: number): Article | null {
    const row = this.sqlite.db
      .prepare(`${this.selectAll()} WHERE a.id = ?`)
      .get(id) as ArticleRow | undefined;
    return row ? this.toArticle(row, new Date().toISOString()) : null;
  }

  findOneOrFail(id: number): Article {
    const article = this.findOne(id);
    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết ${id}`);
    }
    return article;
  }

  findBySlug(slug: string): Article | null {
    const row = this.sqlite.db
      .prepare(`${this.selectAll()} WHERE a.slug = ?`)
      .get(slug) as ArticleRow | undefined;
    return row ? this.toArticle(row, new Date().toISOString()) : null;
  }

  count(): number {
    const row = this.sqlite.db
      .prepare('SELECT COUNT(*) AS total FROM articles')
      .get() as { total: number | bigint } | undefined;
    return Number(row?.total ?? 0);
  }

  create(dto: CreateArticleDto): Article {
    return this.sqlite.transaction(() => {
      this.assertCategory(dto.categoryDetailId);

      const now = new Date().toISOString();
      const status = dto.status ?? 'draft';
      const slug = this.resolveSlug(dto.slug, dto.title);

      const result = this.sqlite.db
        .prepare(
          `INSERT INTO articles
             (categoryDetailId, slug, title, summary, content, coverImage,
              author, publishedAt, status, featured, viewCount,
              createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        )
        .run(
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
        );

      return this.findOneOrFail(Number(result.lastInsertRowid));
    });
  }

  update(id: number, dto: UpdateArticleDto): Article {
    return this.sqlite.transaction(() => {
      const current = this.findOneOrFail(id);

      if (dto.categoryDetailId !== undefined) {
        this.assertCategory(dto.categoryDetailId);
      }

      const now = new Date().toISOString();
      const status = dto.status ?? current.status;
      const slug =
        dto.slug === undefined
          ? current.slug
          : this.resolveSlug(dto.slug, dto.title ?? current.title, id);

      // Không gửi trường ngày thì giữ nguyên ngày cũ. Quy tắc "published mà
      // chưa có ngày thì lấy bây giờ" nằm trong resolvePublishedAt, nên nó áp
      // dụng cho cả hai đường.
      const publishedAt = this.resolvePublishedAt(
        dto.publishedAt !== undefined ? dto.publishedAt : current.publishedAt,
        status,
        now,
      );

      this.sqlite.db
        .prepare(
          `UPDATE articles
              SET categoryDetailId = ?, slug = ?, title = ?, summary = ?,
                  content = ?, coverImage = ?, author = ?, publishedAt = ?,
                  status = ?, featured = ?, updatedAt = ?
            WHERE id = ?`,
        )
        .run(
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
        );

      return this.findOneOrFail(id);
    });
  }

  remove(id: number): void {
    this.findOneOrFail(id);
    this.sqlite.db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  }

  /** Đếm lượt xem ở trang ngoài. Không đụng `updatedAt`: đây không phải sửa bài. */
  recordView(slug: string): void {
    this.sqlite.db
      .prepare('UPDATE articles SET viewCount = viewCount + 1 WHERE slug = ?')
      .run(slug);
  }

  /** Số bài theo từng chuyên mục, dùng cho bộ lọc ở trang ngoài. */
  countsByCategory(onlyLive = false): Record<number, number> {
    const now = new Date().toISOString();
    const rows = this.sqlite.db
      .prepare(
        `SELECT categoryDetailId AS id, COUNT(*) AS total
           FROM articles
          ${
            onlyLive
              ? "WHERE status = 'published' AND publishedAt IS NOT NULL AND publishedAt <= ?"
              : ''
          }
          GROUP BY categoryDetailId`,
      )
      .all(...(onlyLive ? [now] : [])) as {
      id: number | bigint;
      total: number | bigint;
    }[];

    return Object.fromEntries(
      rows.map((row) => [Number(row.id), Number(row.total)]),
    );
  }

  /**
   * Chuyên mục phải là chi tiết đang bật của đúng danh mục `DM_CHUYEN_MUC`.
   * Truy vấn thẳng bảng thay vì phụ thuộc CategoriesModule — cùng một kết nối
   * SQLite, và tránh vòng phụ thuộc giữa hai module.
   */
  private assertCategory(categoryDetailId: number): void {
    const row = this.sqlite.db
      .prepare(
        `SELECT d.status AS status
           FROM category_details d
           JOIN categories c ON c.id = d.categoryId
          WHERE d.id = ? AND c.code = ?`,
      )
      .get(categoryDetailId, ARTICLE_CATEGORY_CODE) as
      { status: string } | undefined;

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
  private resolveSlug(
    requested: string | undefined,
    title: string,
    selfId?: number,
  ): string {
    const base =
      (requested && slugify(requested)) || slugify(title) || 'bai-viet';

    for (let suffix = 1; ; suffix += 1) {
      const candidate = suffix === 1 ? base : `${base}-${suffix}`;
      const clash = this.sqlite.db
        .prepare('SELECT id FROM articles WHERE slug = ?')
        .get(candidate) as { id: number | bigint } | undefined;

      if (!clash || (selfId !== undefined && Number(clash.id) === selfId)) {
        return candidate;
      }
    }
  }
}
