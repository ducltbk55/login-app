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

  private async categoryIdByCode(code: string): Promise<number | null> {
    const categories = await this.categories.list();
    return categories.find((c) => c.code === code)?.id ?? null;
  }

  async listProvinces(): Promise<AddressOption[]> {
    const categoryId = await this.categoryIdByCode(PROVINCE_CATEGORY_CODE);
    if (categoryId === null) return [];

    const details = await this.details.list(categoryId, { status: 'active' });
    return details.map((detail) => ({ code: detail.code, name: detail.name }));
  }

  /** Phường/xã của một tỉnh; tỉnh không tồn tại thì trả mảng rỗng. */
  async listWards(provinceCode: string): Promise<AddressOption[]> {
    const wardCategoryId = await this.categoryIdByCode(WARD_CATEGORY_CODE);
    const province = await this.findProvinceDetail(provinceCode);
    if (wardCategoryId === null || province === null) return [];

    const details = await this.details.list(wardCategoryId, {
      status: 'active',
      groupDetailId: province.id,
    });
    return details.map((detail) => ({ code: detail.code, name: detail.name }));
  }

  private async findProvinceDetail(
    code: string,
  ): Promise<{ id: number } | null> {
    const categoryId = await this.categoryIdByCode(PROVINCE_CATEGORY_CODE);
    if (categoryId === null) return null;

    const details = await this.details.list(categoryId);
    return details.find((detail) => detail.code === code) ?? null;
  }

  /**
   * Chặn địa chỉ bịa: mã tỉnh phải có thật và phường phải thuộc đúng tỉnh đó.
   * Form chỉ đưa lựa chọn hợp lệ, nhưng request tự chế thì không.
   */
  async assertValidAddress(
    provinceCode: string,
    wardCode: string,
  ): Promise<void> {
    const provinces = await this.listProvinces();
    const province = provinces.find((p) => p.code === provinceCode);
    if (!province) {
      throw new BadRequestException(
        `Không tìm thấy tỉnh/thành phố có mã "${provinceCode}"`,
      );
    }

    const wards = await this.listWards(provinceCode);
    const ward = wards.find((w) => w.code === wardCode);
    if (!ward) {
      throw new BadRequestException(
        `Phường/xã "${wardCode}" không thuộc ${province.name}`,
      );
    }
  }

  /** Dạng hiển thị đầy đủ, dùng cho trang admin và trang cá nhân. */
  async describe(
    provinceCode: string | null,
    wardCode: string | null,
  ): Promise<{ province: string | null; ward: string | null }> {
    if (!provinceCode) return { province: null, ward: null };

    const provinces = await this.listProvinces();
    const province =
      provinces.find((p) => p.code === provinceCode)?.name ?? null;

    let ward: string | null = null;
    if (wardCode) {
      const wards = await this.listWards(provinceCode);
      ward = wards.find((w) => w.code === wardCode)?.name ?? null;
    }

    return { province, ward };
  }
}
