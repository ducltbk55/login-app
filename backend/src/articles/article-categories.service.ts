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

  onModuleInit(): void {
    this.ensureSeeded();
  }

  /** Public và idempotent — Nest không đảm bảo thứ tự onModuleInit. */
  ensureSeeded(): void {
    const category = this.ensureCategory();

    const existing = new Map(
      this.details.list(category.id).map((detail) => [detail.code, detail]),
    );

    let added = 0;
    ARTICLE_CATEGORY_SEEDS.forEach((seed, index) => {
      const order = index + 1; // thứ tự hiển thị đánh số từ 1
      const current = existing.get(seed.code);

      if (!current) {
        this.details.create(category.id, {
          code: seed.code,
          name: seed.name,
          order,
        });
        added += 1;
        return;
      }

      if (current.order !== order) {
        this.details.update(category.id, current.id, { order });
      }
    });

    if (added > 0) {
      this.logger.log(`Đã thêm ${added} chuyên mục mặc định`);
    }
  }

  /** Danh mục chuyên mục; dùng cho chỗ cần biết id của nó. */
  category(): Category | null {
    return (
      this.categories.list().find((c) => c.code === ARTICLE_CATEGORY_CODE) ??
      null
    );
  }

  /** Các chuyên mục đang bật, theo đúng thứ tự hiển thị của danh mục. */
  list(): CategoryDetail[] {
    const category = this.category();
    if (!category) return [];
    return this.details.list(category.id, { status: 'active' });
  }

  private ensureCategory(): Category {
    const found = this.category();
    if (found) return found;

    this.logger.log(`Tạo danh mục "${ARTICLE_CATEGORY_NAME}"`);
    return this.categories.create({
      code: ARTICLE_CATEGORY_CODE,
      name: ARTICLE_CATEGORY_NAME,
      descriptions: ARTICLE_CATEGORY_DESCRIPTION,
    });
  }
}
