import { BadRequestException, Injectable } from '@nestjs/common';

import {
  PROVINCE_CATEGORY_CODE,
  WARD_CATEGORY_CODE,
} from '../common/administrative';
import { CategoriesService } from './categories.service';
import { CategoryDetailsService } from './category-details.service';

export type AddressOption = { code: string; name: string };

/**
 * Tra cứu tỉnh/thành và phường/xã cho form địa chỉ.
 *
 * Dữ liệu nằm trong hai danh mục thông thường (`DM_TINH_TP` nhóm cho
 * `DM_PHUONG_XA`), nên lớp này chỉ là một mặt tiền gọn gàng: nơi dùng không
 * cần biết id danh mục là bao nhiêu, chỉ làm việc với mã hành chính.
 */
@Injectable()
export class AddressService {
  constructor(
    private readonly categories: CategoriesService,
    private readonly details: CategoryDetailsService,
  ) {}

  private categoryIdByCode(code: string): number | null {
    return this.categories.list().find((c) => c.code === code)?.id ?? null;
  }

  listProvinces(): AddressOption[] {
    const categoryId = this.categoryIdByCode(PROVINCE_CATEGORY_CODE);
    if (categoryId === null) return [];

    return this.details
      .list(categoryId, { status: 'active' })
      .map((detail) => ({ code: detail.code, name: detail.name }));
  }

  /** Phường/xã của một tỉnh; tỉnh không tồn tại thì trả mảng rỗng. */
  listWards(provinceCode: string): AddressOption[] {
    const wardCategoryId = this.categoryIdByCode(WARD_CATEGORY_CODE);
    const province = this.findProvinceDetail(provinceCode);
    if (wardCategoryId === null || province === null) return [];

    return this.details
      .list(wardCategoryId, { status: 'active', groupDetailId: province.id })
      .map((detail) => ({ code: detail.code, name: detail.name }));
  }

  private findProvinceDetail(code: string): { id: number } | null {
    const categoryId = this.categoryIdByCode(PROVINCE_CATEGORY_CODE);
    if (categoryId === null) return null;

    return (
      this.details.list(categoryId).find((detail) => detail.code === code) ??
      null
    );
  }

  /**
   * Chặn địa chỉ bịa: mã tỉnh phải có thật và phường phải thuộc đúng tỉnh đó.
   * Form chỉ đưa lựa chọn hợp lệ, nhưng request tự chế thì không.
   */
  assertValidAddress(provinceCode: string, wardCode: string): void {
    const province = this.listProvinces().find((p) => p.code === provinceCode);
    if (!province) {
      throw new BadRequestException(
        `Không tìm thấy tỉnh/thành phố có mã "${provinceCode}"`,
      );
    }

    const ward = this.listWards(provinceCode).find((w) => w.code === wardCode);
    if (!ward) {
      throw new BadRequestException(
        `Phường/xã "${wardCode}" không thuộc ${province.name}`,
      );
    }
  }

  /** Dạng hiển thị đầy đủ, dùng cho trang admin và trang cá nhân. */
  describe(
    provinceCode: string | null,
    wardCode: string | null,
  ): { province: string | null; ward: string | null } {
    if (!provinceCode) return { province: null, ward: null };

    const province =
      this.listProvinces().find((p) => p.code === provinceCode)?.name ?? null;
    const ward = wardCode
      ? (this.listWards(provinceCode).find((w) => w.code === wardCode)?.name ??
        null)
      : null;

    return { province, ward };
  }
}
