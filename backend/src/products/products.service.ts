import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  isBlankArticleHtml,
  normalizeArticleContent,
} from '../articles/article-content';
import { PRODUCT_CATEGORY_CODE } from '../common/product-categories';
import { matchesSearch } from '../common/search';
import { parseVideoUrl } from '../common/video';
import { slugify } from '../common/slugify';
import { SqliteService } from '../database/sqlite.service';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto, UpdateProductDto } from './dto/save-product.dto';
import {
  discountPercentOf,
  type Product,
  type ProductSort,
  type ProductSpec,
  type ProductStatus,
} from './product.entity';

type ProductRow = {
  id: number | bigint;
  categoryDetailId: number | bigint;
  slug: string;
  name: string;
  sku: string | null;
  summary: string | null;
  description: string | null;
  image: string | null;
  gallery: string | null;
  specs: string | null;
  videoUrl: string | null;
  price: number | bigint | null;
  salePrice: number | bigint | null;
  launchedAt: string | null;
  status: string;
  inStock: number | bigint;
  createdAt: string;
  updatedAt: string;
  categoryCode: string | null;
  categoryName: string | null;
};

/**
 * Cột `gallery` là JSON. Đọc phòng thủ: dòng hỏng (sửa tay DB) thì coi như
 * không có ảnh thay vì làm vỡ cả trang sản phẩm.
 */
function parseGallery(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

/** Cột `specs` là JSON — đọc phòng thủ như `gallery`. */
function parseSpecs(raw: string | null): ProductSpec[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is ProductSpec =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as ProductSpec).label === 'string' &&
        typeof (item as ProductSpec).value === 'string',
    );
  } catch {
    return [];
  }
}

/**
 * Chuẩn hoá bảng thông số trước khi lưu: chỉ giữ `label`/`value` (bỏ trường
 * lạ), và chặn trùng nhãn — hai dòng "Camera" thì khách không biết tin dòng nào.
 */
function cleanSpecs(specs: ProductSpec[]): string {
  const seen = new Set<string>();
  const clean = specs.map(({ label, value }) => {
    const key = label.toLocaleLowerCase('vi');
    if (seen.has(key)) {
      throw new BadRequestException(`Thông số "${label}" bị trùng`);
    }
    seen.add(key);
    return { label, value };
  });
  return JSON.stringify(clean);
}

/** Link video phải thuộc dạng nhúng được, không thì báo rõ cho admin. */
function cleanVideoUrl(url: string | null): string | null {
  if (url === null) return null;
  if (!parseVideoUrl(url)) {
    throw new BadRequestException(
      'Link video chưa được hỗ trợ. Hãy dùng link YouTube, Vimeo hoặc file .mp4/.webm (https).',
    );
  }
  return url.trim();
}

/** Bỏ ảnh trùng, giữ thứ tự lần xuất hiện đầu. */
const uniqueGallery = (urls: string[]) => [...new Set(urls)];

const toNumber = (value: number | bigint | null): number | null =>
  value === null ? null : Number(value);

/** Mốc "ra mắt" để sắp xếp: chưa đặt ngày ra mắt thì dùng ngày tạo. */
const launchKey = (p: Product) => p.launchedAt ?? p.createdAt;

/**
 * Sắp theo giá: chưa có giá ("Liên hệ") luôn xuống cuối dù tăng hay giảm,
 * khách lọc theo giá là đang muốn so con số.
 */
function byPrice(direction: 1 | -1) {
  return (a: Product, b: Product) => {
    if (a.effectivePrice === null && b.effectivePrice === null) return 0;
    if (a.effectivePrice === null) return 1;
    if (b.effectivePrice === null) return -1;
    return (a.effectivePrice - b.effectivePrice) * direction;
  };
}

const SORTERS: Record<ProductSort, (a: Product, b: Product) => number> = {
  'launch-desc': (a, b) => launchKey(b).localeCompare(launchKey(a)),
  'launch-asc': (a, b) => launchKey(a).localeCompare(launchKey(b)),
  'price-asc': byPrice(1),
  'price-desc': byPrice(-1),
  'updated-desc': (a, b) => b.updatedAt.localeCompare(a.updatedAt),
};

@Injectable()
export class ProductsService {
  constructor(private readonly sqlite: SqliteService) {}

  private toProduct(row: ProductRow): Product {
    const status = row.status as ProductStatus;
    const price = toNumber(row.price);
    const salePrice = toNumber(row.salePrice);

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
      name: row.name,
      sku: row.sku,
      summary: row.summary,
      description:
        row.description === null
          ? null
          : normalizeArticleContent(row.description),
      image: row.image,
      gallery: parseGallery(row.gallery),
      specs: parseSpecs(row.specs),
      videoUrl: row.videoUrl ?? null,
      price,
      salePrice,
      launchedAt: row.launchedAt,
      status,
      inStock: Number(row.inStock) === 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      effectivePrice: salePrice ?? price,
      discountPercent: discountPercentOf(price, salePrice),
      live: status === 'published',
    };
  }

  private selectAll(): string {
    return `SELECT p.*, d.code AS categoryCode, d.name AS categoryName
              FROM products p
              LEFT JOIN category_details d ON d.id = p.categoryDetailId`;
  }

  list(query: ListProductsDto = {}): Product[] {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (query.live) {
      where.push("p.status = 'published'");
    } else if (query.status !== undefined) {
      where.push('p.status = ?');
      params.push(query.status);
    }
    if (query.categoryDetailId !== undefined) {
      where.push('p.categoryDetailId = ?');
      params.push(query.categoryDetailId);
    }
    if (query.ids !== undefined) {
      // Danh sách rỗng (vd. giỏ hàng trống) thì không có gì để trả.
      if (query.ids.length === 0) return [];
      where.push(`p.id IN (${query.ids.map(() => '?').join(', ')})`);
      params.push(...query.ids);
    }

    const rows = this.sqlite.db
      .prepare(
        `${this.selectAll()}
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}`,
      )
      .all(...params) as ProductRow[];

    let items = rows.map((row) => this.toProduct(row));

    // Lọc giá trong JS vì so với giá thực trả — cột suy ra, không có trong DB.
    const { minPrice, maxPrice } = query;
    if (minPrice !== undefined || maxPrice !== undefined) {
      items = items.filter(
        (p) =>
          p.effectivePrice !== null &&
          (minPrice === undefined || p.effectivePrice >= minPrice) &&
          (maxPrice === undefined || p.effectivePrice <= maxPrice),
      );
    }

    // Lọc chữ trong JS vì SQLite dựng sẵn không bỏ dấu được — xem common/search.ts
    if (query.search) {
      const search = query.search;
      items = items.filter((p) => matchesSearch(search, p.name, p.sku));
    }

    const sorter = SORTERS[query.sort ?? 'launch-desc'];
    // `id` giảm dần làm khoá phụ để thứ tự ổn định khi trùng ngày/giá.
    return items.sort((a, b) => sorter(a, b) || b.id - a.id);
  }

  findOne(id: number): Product | null {
    const row = this.sqlite.db
      .prepare(`${this.selectAll()} WHERE p.id = ?`)
      .get(id) as ProductRow | undefined;
    return row ? this.toProduct(row) : null;
  }

  findOneOrFail(id: number): Product {
    const product = this.findOne(id);
    if (!product) throw new NotFoundException(`Không có sản phẩm #${id}`);
    return product;
  }

  findBySlug(slug: string): Product | null {
    const row = this.sqlite.db
      .prepare(`${this.selectAll()} WHERE p.slug = ?`)
      .get(slug) as ProductRow | undefined;
    return row ? this.toProduct(row) : null;
  }

  count(): number {
    const row = this.sqlite.db
      .prepare('SELECT COUNT(*) AS total FROM products')
      .get() as { total: number | bigint } | undefined;
    return Number(row?.total ?? 0);
  }

  create(dto: CreateProductDto): Product {
    return this.sqlite.transaction(() => {
      this.assertCategory(dto.categoryDetailId);

      const price = dto.price ?? null;
      const salePrice = dto.salePrice ?? null;
      this.assertPrices(price, salePrice);

      const sku = dto.sku ?? null;
      this.assertSkuFree(sku);

      const now = new Date().toISOString();
      const result = this.sqlite.db
        .prepare(
          `INSERT INTO products
             (categoryDetailId, slug, name, sku, summary, description, image,
              gallery, specs, videoUrl, price, salePrice, launchedAt, status,
              inStock, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          dto.categoryDetailId,
          this.resolveSlug(dto.slug, dto.name),
          dto.name,
          sku,
          dto.summary ?? null,
          this.cleanDescription(dto.description ?? null),
          dto.image ?? null,
          JSON.stringify(uniqueGallery(dto.gallery ?? [])),
          cleanSpecs(dto.specs ?? []),
          cleanVideoUrl(dto.videoUrl ?? null),
          price,
          salePrice,
          dto.launchedAt ?? null,
          dto.status ?? 'draft',
          (dto.inStock ?? true) ? 1 : 0,
          now,
          now,
        );

      return this.findOneOrFail(Number(result.lastInsertRowid));
    });
  }

  update(id: number, dto: UpdateProductDto): Product {
    return this.sqlite.transaction(() => {
      const current = this.findOneOrFail(id);

      if (dto.categoryDetailId !== undefined) {
        this.assertCategory(dto.categoryDetailId);
      }

      // `undefined` = không gửi → giữ nguyên; `null` = xoá giá.
      const price = dto.price !== undefined ? dto.price : current.price;
      const salePrice =
        dto.salePrice !== undefined ? dto.salePrice : current.salePrice;
      this.assertPrices(price, salePrice);

      const sku = dto.sku !== undefined ? dto.sku : current.sku;
      this.assertSkuFree(sku, id);

      const slug =
        dto.slug === undefined
          ? current.slug
          : this.resolveSlug(dto.slug, dto.name ?? current.name, id);

      this.sqlite.db
        .prepare(
          `UPDATE products
              SET categoryDetailId = ?, slug = ?, name = ?, sku = ?,
                  summary = ?, description = ?, image = ?, gallery = ?,
                  specs = ?, videoUrl = ?, price = ?, salePrice = ?, launchedAt = ?, status = ?,
                  inStock = ?, updatedAt = ?
            WHERE id = ?`,
        )
        .run(
          dto.categoryDetailId ?? current.categoryDetailId,
          slug,
          dto.name ?? current.name,
          sku,
          dto.summary !== undefined ? dto.summary : current.summary,
          dto.description !== undefined
            ? this.cleanDescription(dto.description)
            : current.description,
          dto.image !== undefined ? dto.image : current.image,
          JSON.stringify(uniqueGallery(dto.gallery ?? current.gallery)),
          cleanSpecs(dto.specs ?? current.specs),
          dto.videoUrl !== undefined
            ? cleanVideoUrl(dto.videoUrl)
            : current.videoUrl,
          price,
          salePrice,
          dto.launchedAt !== undefined ? dto.launchedAt : current.launchedAt,
          dto.status ?? current.status,
          (dto.inStock ?? current.inStock) ? 1 : 0,
          new Date().toISOString(),
          id,
        );

      return this.findOneOrFail(id);
    });
  }

  remove(id: number): void {
    this.findOneOrFail(id);
    this.sqlite.db.prepare('DELETE FROM products WHERE id = ?').run(id);
  }

  /** Số sản phẩm theo từng lĩnh vực, cho bộ lọc ở trang ngoài. */
  countsByCategory(onlyLive = false): Record<number, number> {
    const rows = this.sqlite.db
      .prepare(
        `SELECT categoryDetailId AS id, COUNT(*) AS total
           FROM products
          ${onlyLive ? "WHERE status = 'published'" : ''}
          GROUP BY categoryDetailId`,
      )
      .all() as { id: number | bigint; total: number | bigint }[];

    return Object.fromEntries(
      rows.map((row) => [Number(row.id), Number(row.total)]),
    );
  }

  /**
   * Giá khuyến mãi chỉ có nghĩa khi có giá niêm yết để so, và phải thấp hơn
   * nó — "khuyến mãi" mà bằng hoặc đắt hơn thì trang ngoài sẽ hiện % âm.
   */
  private assertPrices(price: number | null, salePrice: number | null): void {
    if (salePrice === null) return;
    if (price === null) {
      throw new BadRequestException(
        'Có giá khuyến mãi thì phải nhập giá niêm yết',
      );
    }
    if (salePrice >= price) {
      throw new BadRequestException(
        'Giá khuyến mãi phải thấp hơn giá niêm yết',
      );
    }
  }

  private assertSkuFree(sku: string | null, selfId?: number): void {
    if (sku === null) return;
    const clash = this.sqlite.db
      .prepare('SELECT id FROM products WHERE sku = ? COLLATE NOCASE')
      .get(sku) as { id: number | bigint } | undefined;

    if (clash && Number(clash.id) !== selfId) {
      throw new ConflictException(`Mã sản phẩm "${sku}" đã được dùng`);
    }
  }

  /** HTML mô tả → đã lọc; mô tả rỗng theo nghĩa người đọc thì lưu null. */
  private cleanDescription(description: string | null): string | null {
    if (description === null) return null;
    const html = normalizeArticleContent(description);
    return isBlankArticleHtml(html) ? null : html;
  }

  /**
   * Lĩnh vực phải là chi tiết đang bật của đúng danh mục `DM_LINH_VUC_SP`.
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
      .get(categoryDetailId, PRODUCT_CATEGORY_CODE) as
      { status: string } | undefined;

    if (!row) {
      throw new BadRequestException(
        `Lĩnh vực không hợp lệ: phải là một chi tiết của danh mục ${PRODUCT_CATEGORY_CODE}`,
      );
    }
    if (row.status !== 'active') {
      throw new BadRequestException(
        'Lĩnh vực này đang tắt, không gán sản phẩm mới vào được',
      );
    }
  }

  /** Slug duy nhất: trùng thì thêm hậu tố -2, -3… */
  private resolveSlug(
    requested: string | undefined,
    name: string,
    selfId?: number,
  ): string {
    const base =
      (requested && slugify(requested)) || slugify(name) || 'san-pham';

    for (let suffix = 1; ; suffix += 1) {
      const candidate = suffix === 1 ? base : `${base}-${suffix}`;
      const clash = this.sqlite.db
        .prepare('SELECT id FROM products WHERE slug = ?')
        .get(candidate) as { id: number | bigint } | undefined;

      if (!clash || (selfId !== undefined && Number(clash.id) === selfId)) {
        return candidate;
      }
    }
  }
}
