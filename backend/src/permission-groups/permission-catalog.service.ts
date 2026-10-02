import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';

import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import type { Category } from '../categories/category.entity';
import {
  FUNCTION_CATEGORY_CODE,
  FUNCTION_CATEGORY_DESCRIPTION,
  FUNCTION_CATEGORY_NAME,
  FUNCTION_SEEDS,
  PERMISSION_CATEGORY_CODE,
  PERMISSION_CATEGORY_DESCRIPTION,
  PERMISSION_CATEGORY_NAME,
  PERMISSION_SEEDS,
  permissionGroupOf,
  type PermissionDef,
} from '../common/permissions';

/**
 * Danh mục quyền của hệ thống, đọc từ chi tiết của danh mục `DM_QUYEN`.
 *
 * Danh mục đó lấy `DM_CHUC_NANG` làm nhóm, nên mỗi quyền thuộc về một
 * chức năng và form nhóm quyền hiển thị đúng tên chức năng tiếng Việt.
 */
@Injectable()
export class PermissionCatalogService implements OnModuleInit {
  private readonly logger = new Logger(PermissionCatalogService.name);

  constructor(
    private readonly categories: CategoriesService,
    private readonly details: CategoryDetailsService,
  ) {}

  onModuleInit(): void {
    this.ensureSeeded();
  }

  /**
   * Bảo đảm hai danh mục tồn tại, liên kết nhóm đúng và có đủ hạt giống.
   *
   * Chỉ chèn thêm cái còn thiếu: chức năng/quyền do admin tự tạo, nhãn đã sửa
   * hay quyền đã tắt đều được giữ nguyên qua mỗi lần khởi động.
   *
   * Public và idempotent vì Nest không đảm bảo thứ tự `onModuleInit` giữa các
   * provider: service nào cần danh mục quyền thì gọi trước cho chắc.
   */
  ensureSeeded(): void {
    const functions = this.ensureFunctionCategory();
    const permissions = this.ensurePermissionCategory(functions.id);
    this.ensurePermissionDetails(permissions, functions.id);
  }

  /** Danh mục chức năng + các chi tiết của nó (Người dùng, Danh mục...). */
  private ensureFunctionCategory(): Category {
    const category =
      this.findByCode(FUNCTION_CATEGORY_CODE) ??
      this.createCategory(
        FUNCTION_CATEGORY_CODE,
        FUNCTION_CATEGORY_NAME,
        FUNCTION_CATEGORY_DESCRIPTION,
      );

    const existing = new Map(
      this.details.list(category.id).map((detail) => [detail.code, detail]),
    );

    FUNCTION_SEEDS.forEach((seed, index) => {
      const order = index + 1; // thứ tự hiển thị đánh số từ 1
      const current = existing.get(seed.code);

      if (!current) {
        this.details.create(category.id, {
          code: seed.code,
          name: seed.label,
          order,
        });
        this.logger.log(
          `Thêm chức năng "${seed.label}" vào danh mục chức năng`,
        );
        return;
      }

      if (current.order !== order) {
        this.details.update(category.id, current.id, { order });
      }
    });

    return category;
  }

  /** Danh mục quyền, luôn trỏ nhóm về danh mục chức năng. */
  private ensurePermissionCategory(functionCategoryId: number): Category {
    const found = this.findByCode(PERMISSION_CATEGORY_CODE);

    if (!found) {
      return this.createCategory(
        PERMISSION_CATEGORY_CODE,
        PERMISSION_CATEGORY_NAME,
        PERMISSION_CATEGORY_DESCRIPTION,
        functionCategoryId,
      );
    }

    if (found.groupCategoryId === functionCategoryId) return found;

    // DB cũ: danh mục quyền chưa phân nhóm. Gán nhóm ở đây; thao tác này xoá
    // groupDetailId của các chi tiết, nên bước sau sẽ gán lại theo hạt giống.
    this.logger.log('Gán danh mục chức năng làm nhóm cho danh mục quyền');
    return this.categories.update(found.id, {
      groupCategoryId: functionCategoryId,
    });
  }

  /** Mỗi quyền là một chi tiết, thuộc về chi tiết chức năng tương ứng. */
  private ensurePermissionDetails(
    permissionCategory: Category,
    functionCategoryId: number,
  ): void {
    const functionIdByCode = new Map(
      this.details
        .list(functionCategoryId)
        .map((detail) => [detail.code, detail.id]),
    );
    const existing = new Map(
      this.details
        .list(permissionCategory.id)
        .map((detail) => [detail.code, detail]),
    );

    let added = 0;
    let linked = 0;

    PERMISSION_SEEDS.forEach((seed, index) => {
      const groupDetailId = functionIdByCode.get(seed.functionCode);
      if (groupDetailId === undefined) return; // admin đã xoá chức năng này

      const order = index + 1; // thứ tự hiển thị đánh số từ 1
      const current = existing.get(seed.code);

      if (!current) {
        this.details.create(permissionCategory.id, {
          code: seed.code,
          name: seed.label,
          order,
          groupDetailId,
        });
        added += 1;
        return;
      }

      // Chi tiết có sẵn nhưng chưa có nhóm (dữ liệu cũ) thì gán lại.
      if (current.groupDetailId === null) {
        this.details.update(permissionCategory.id, current.id, {
          groupDetailId,
        });
        linked += 1;
      }

      if (current.order !== order) {
        this.details.update(permissionCategory.id, current.id, { order });
      }
    });

    if (added > 0) {
      this.logger.log(`Đã thêm ${added} quyền mặc định vào danh mục quyền`);
    }
    if (linked > 0) {
      this.logger.log(`Đã gán chức năng cho ${linked} quyền có sẵn`);
    }
  }

  private findByCode(code: string): Category | null {
    return this.categories.list().find((c) => c.code === code) ?? null;
  }

  private createCategory(
    code: string,
    name: string,
    descriptions: string,
    groupCategoryId?: number,
  ): Category {
    this.logger.log(`Tạo danh mục "${name}"`);
    return this.categories.create({
      code,
      name,
      descriptions,
      groupCategoryId,
    });
  }

  /** Toàn bộ quyền đang bật, đã sắp theo thứ tự hiển thị của danh mục. */
  list(): PermissionDef[] {
    const category = this.findByCode(PERMISSION_CATEGORY_CODE);
    if (!category) return [];

    return this.details
      .list(category.id, { status: 'active' })
      .map((detail) => ({
        key: detail.code,
        // Tên chức năng lấy từ chi tiết nhóm; chưa phân nhóm thì tạm dùng mã.
        group: detail.group?.name ?? permissionGroupOf(detail.code),
        label: detail.name,
        description: detail.descriptions,
      }));
  }

  keys(): string[] {
    return this.list().map((permission) => permission.key);
  }

  /**
   * Chặn việc gán quyền không có trong danh mục (hoặc đã bị tắt). Trước đây
   * việc này do `@IsIn` trong DTO lo, nhưng danh sách giờ nằm trong DB nên
   * phải kiểm tra lúc chạy.
   */
  assertAllExist(permissions: string[]): void {
    const known = new Set(this.keys());
    const unknown = permissions.filter((p) => !known.has(p));

    if (unknown.length > 0) {
      throw new BadRequestException(
        `Quyền không có trong danh mục quyền hoặc đã bị tắt: ${unknown.join(', ')}`,
      );
    }
  }
}
