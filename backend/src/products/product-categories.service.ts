import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import type { Category, CategoryDetail } from '../categories/category.entity';
import {
  PRODUCT_CATEGORY_CODE,
  PRODUCT_CATEGORY_DESCRIPTION,
  PRODUCT_CATEGORY_NAME,
} from '../common/product-categories';

/**
 * Bảo đảm danh mục `DM_LINH_VUC_SP` luôn có mặt, và đọc các lĩnh vực đang bật.
 * Chi tiết (từng lĩnh vực) do admin tự nhập ở màn Danh mục.
 */
@Injectable()
export class ProductCategoriesService implements OnModuleInit {
  private readonly logger = new Logger(ProductCategoriesService.name);

  constructor(
    private readonly categories: CategoriesService,
    private readonly details: CategoryDetailsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCategory();
  }

  async category(): Promise<Category | null> {
    const categories = await this.categories.list();
    return categories.find((c) => c.code === PRODUCT_CATEGORY_CODE) ?? null;
  }

  /** Các lĩnh vực đang bật, theo đúng thứ tự hiển thị của danh mục. */
  async list(): Promise<CategoryDetail[]> {
    const category = await this.category();
    if (!category) return [];
    return this.details.list(category.id, { status: 'active' });
  }

  /** Public và idempotent — test gọi lại được. */
  async ensureCategory(): Promise<Category> {
    const found = await this.category();
    if (found) return found;

    this.logger.log(`Tạo danh mục "${PRODUCT_CATEGORY_NAME}"`);
    return this.categories.create({
      code: PRODUCT_CATEGORY_CODE,
      name: PRODUCT_CATEGORY_NAME,
      descriptions: PRODUCT_CATEGORY_DESCRIPTION,
    });
  }
}
