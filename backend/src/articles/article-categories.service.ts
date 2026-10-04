import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import type { Category, CategoryDetail } from '../categories/category.entity';
import {
  ARTICLE_CATEGORY_CODE,
  ARTICLE_CATEGORY_DESCRIPTION,
  ARTICLE_CATEGORY_NAME,
  ARTICLE_CATEGORY_SEEDS,
} from '../common/article-categories';

/**
 * Bảo đảm danh mục `DM_CHUYEN_MUC` và các chuyên mục mặc định luôn có mặt.
 *
 * Cùng cách làm với danh mục quyền: chỉ chèn cái còn thiếu, không đụng tới
 * chuyên mục admin tự thêm, nhãn đã sửa hay chuyên mục đã tắt.
 */
@Injectable()
export class ArticleCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(ArticleCategoriesService.name);

  constructor(
    private readonly categories: CategoriesService,
    private readonly details: CategoryDetailsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  /** Public và idempotent — Nest không đảm bảo thứ tự onModuleInit. */
  async ensureSeeded(): Promise<void> {
    const category = await this.ensureCategory();

    const existing = new Map(
      (await this.details.list(category.id)).map((detail) => [
        detail.code,
        detail,
      ]),
    );

    let added = 0;
    for (const [index, seed] of ARTICLE_CATEGORY_SEEDS.entries()) {
      const order = index + 1; // thứ tự hiển thị đánh số từ 1
      const current = existing.get(seed.code);

      if (!current) {
        await this.details.create(category.id, {
          code: seed.code,
          name: seed.name,
          order,
        });
        added += 1;
        continue;
      }

      if (current.order !== order) {
        await this.details.update(category.id, current.id, { order });
      }
    }

    if (added > 0) {
      this.logger.log(`Đã thêm ${added} chuyên mục mặc định`);
    }
  }

  /** Danh mục chuyên mục; dùng cho chỗ cần biết id của nó. */
  async category(): Promise<Category | null> {
    return (
      (await this.categories.list()).find(
        (c) => c.code === ARTICLE_CATEGORY_CODE,
      ) ?? null
    );
  }

  /** Các chuyên mục đang bật, theo đúng thứ tự hiển thị của danh mục. */
  async list(): Promise<CategoryDetail[]> {
    const category = await this.category();
    if (!category) return [];
    return this.details.list(category.id, { status: 'active' });
  }

  private async ensureCategory(): Promise<Category> {
    const found = await this.category();
    if (found) return found;

    this.logger.log(`Tạo danh mục "${ARTICLE_CATEGORY_NAME}"`);
    return this.categories.create({
      code: ARTICLE_CATEGORY_CODE,
      name: ARTICLE_CATEGORY_NAME,
      descriptions: ARTICLE_CATEGORY_DESCRIPTION,
    });
  }
}
