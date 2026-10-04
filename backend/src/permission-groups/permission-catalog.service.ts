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
  type FunctionDef,
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
  /** Lần seed đang chạy (nếu có), để các lời gọi đồng thời chờ chung. */
  private seeding?: Promise<void>;

  constructor(
    private readonly categories: CategoriesService,
    private readonly details: CategoryDetailsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  /**
   * Bảo đảm hai danh mục tồn tại, liên kết nhóm đúng và có đủ hạt giống.
   *
   * Chỉ chèn thêm cái còn thiếu: chức năng/quyền do admin tự tạo, nhãn đã sửa
   * hay quyền đã tắt đều được giữ nguyên qua mỗi lần khởi động.
   *
   * Public và idempotent vì Nest không đảm bảo thứ tự `onModuleInit` giữa các
   * provider: service nào cần danh mục quyền thì gọi trước cho chắc.
   *
   * Nest chạy `onModuleInit` của các provider song song, nên các lời gọi đồng
   * thời dùng chung một lần seed thay vì cùng INSERT rồi vướng UNIQUE.
   */
  ensureSeeded(): Promise<void> {
    this.seeding ??= this.seed().finally(() => {
      this.seeding = undefined;
    });
    return this.seeding;
  }

  private async seed(): Promise<void> {
    const functions = await this.ensureFunctionCategory();
    const permissions = await this.ensurePermissionCategory(functions.id);
    await this.ensurePermissionDetails(permissions, functions.id);
  }

  /** Danh mục chức năng + các chi tiết của nó (Người dùng, Danh mục...). */
  private async ensureFunctionCategory(): Promise<Category> {
    const category =
      (await this.findByCode(FUNCTION_CATEGORY_CODE)) ??
      (await this.createCategory(
        FUNCTION_CATEGORY_CODE,
        FUNCTION_CATEGORY_NAME,
        FUNCTION_CATEGORY_DESCRIPTION,
      ));

    const existing = new Map(
      (await this.details.list(category.id)).map((detail) => [
        detail.code,
        detail,
      ]),
    );

    for (const [index, seed] of FUNCTION_SEEDS.entries()) {
      const order = index + 1; // thứ tự hiển thị đánh số từ 1
      const current = existing.get(seed.code);

      if (!current) {
        await this.details.create(category.id, {
          code: seed.code,
          name: seed.label,
          order,
        });
        this.logger.log(
          `Thêm chức năng "${seed.label}" vào danh mục chức năng`,
        );
        continue;
      }

      if (current.order !== order) {
        await this.details.update(category.id, current.id, { order });
      }
    }

    return category;
  }

  /** Danh mục quyền, luôn trỏ nhóm về danh mục chức năng. */
  private async ensurePermissionCategory(
    functionCategoryId: number,
  ): Promise<Category> {
    const found = await this.findByCode(PERMISSION_CATEGORY_CODE);

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
  private async ensurePermissionDetails(
    permissionCategory: Category,
    functionCategoryId: number,
  ): Promise<void> {
    const functionIdByCode = new Map(
      (await this.details.list(functionCategoryId)).map((detail) => [
        detail.code,
        detail.id,
      ]),
    );
    const existing = new Map(
      (await this.details.list(permissionCategory.id)).map((detail) => [
        detail.code,
        detail,
      ]),
    );

    let added = 0;
    let linked = 0;

    for (const [index, seed] of PERMISSION_SEEDS.entries()) {
      const groupDetailId = functionIdByCode.get(seed.functionCode);
      if (groupDetailId === undefined) continue; // admin đã xoá chức năng này

      const order = index + 1; // thứ tự hiển thị đánh số từ 1
      const current = existing.get(seed.code);

      if (!current) {
        await this.details.create(permissionCategory.id, {
          code: seed.code,
          name: seed.label,
          order,
          groupDetailId,
        });
        added += 1;
        continue;
      }

      // Chi tiết có sẵn nhưng chưa có nhóm (dữ liệu cũ) thì gán lại.
      if (current.groupDetailId === null) {
        await this.details.update(permissionCategory.id, current.id, {
          groupDetailId,
        });
        linked += 1;
      }

      if (current.order !== order) {
        await this.details.update(permissionCategory.id, current.id, {
          order,
        });
      }
    }

    if (added > 0) {
      this.logger.log(`Đã thêm ${added} quyền mặc định vào danh mục quyền`);
    }
    if (linked > 0) {
      this.logger.log(`Đã gán chức năng cho ${linked} quyền có sẵn`);
    }
  }

  private async findByCode(code: string): Promise<Category | null> {
    return (await this.categories.list()).find((c) => c.code === code) ?? null;
  }

  private async createCategory(
    code: string,
    name: string,
    descriptions: string,
    groupCategoryId?: number,
  ): Promise<Category> {
    this.logger.log(`Tạo danh mục "${name}"`);
    return this.categories.create({
      code,
      name,
      descriptions,
      groupCategoryId,
    });
  }

  /** Toàn bộ quyền đang bật, đã sắp theo thứ tự hiển thị của danh mục. */
  async list(): Promise<PermissionDef[]> {
    const category = await this.findByCode(PERMISSION_CATEGORY_CODE);
    if (!category) return [];

    return (await this.details.list(category.id, { status: 'active' })).map(
      (detail) => ({
        key: detail.code,
        // Tên chức năng lấy từ chi tiết nhóm; chưa phân nhóm thì tạm dùng mã.
        group: detail.group?.name ?? permissionGroupOf(detail.code),
        label: detail.name,
        description: detail.descriptions,
      }),
    );
  }

  /**
   * Chức năng đang bật (chi tiết của danh mục chức năng), theo thứ tự hiển
   * thị. Frontend dựng menu quản trị từ đây: đổi tên/thứ tự/tắt một chức
   * năng trong Danh mục là menu đổi theo.
   */
  async functions(): Promise<FunctionDef[]> {
    const category = await this.findByCode(FUNCTION_CATEGORY_CODE);
    if (!category) return [];

    return (await this.details.list(category.id, { status: 'active' })).map(
      (detail) => ({
        code: detail.code,
        label: detail.name,
        order: detail.order,
      }),
    );
  }

  async keys(): Promise<string[]> {
    return (await this.list()).map((permission) => permission.key);
  }

  /**
   * Chặn việc gán quyền không có trong danh mục (hoặc đã bị tắt). Trước đây
   * việc này do `@IsIn` trong DTO lo, nhưng danh sách giờ nằm trong DB nên
   * phải kiểm tra lúc chạy.
   */
  async assertAllExist(permissions: string[]): Promise<void> {
    const known = new Set(await this.keys());
    const unknown = permissions.filter((p) => !known.has(p));

    if (unknown.length > 0) {
      throw new BadRequestException(
        `Quyền không có trong danh mục quyền hoặc đã bị tắt: ${unknown.join(', ')}`,
      );
    }
  }
}
