/**
 * Nạp danh mục đơn vị hành chính Việt Nam vào hai danh mục:
 *
 *   "Tỉnh, Thành phố"  (DM_TINH_TP)
 *   "Phường, Xã"       (DM_PHUONG_XA)  ──  nhóm theo danh mục trên
 *
 * Chạy:  npm run seed:vn
 *
 * Idempotent: chạy lại chỉ chèn những đơn vị còn thiếu và đồng bộ lại cột
 * `order`. Tên, trạng thái, nhóm của bản ghi đã có đều được giữ nguyên.
 *
 * Thứ tự là dữ liệu suy ra từ quy tắc nên script này nắm quyền: tỉnh/thành xếp
 * thành phố trực thuộc trung ương trước rồi đến tỉnh, mỗi loại theo tên; phường
 * xã xếp theo tỉnh (nhờ ORDER BY của service) rồi phường trước xã trước đặc khu.
 * Nếu bạn tự đổi `order` trong giao diện thì lần chạy sau sẽ ghi đè.
 *
 * Dùng chính service của ứng dụng thay vì INSERT thẳng, để mã được chuẩn hoá
 * và ràng buộc phân nhóm được kiểm tra y như khi thêm qua giao diện.
 */
import { NestFactory } from '@nestjs/core';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { AppModule } from '../src/app.module';
import { CategoriesService } from '../src/categories/categories.service';
import { CategoryDetailsService } from '../src/categories/category-details.service';
import type { Category } from '../src/categories/category.entity';
import {
  sortProvinces,
  sortWards,
} from '../src/categories/vn-administrative-order';
import { SqliteService } from '../src/database/sqlite.service';

const PROVINCE_CATEGORY_CODE = 'DM_TINH_TP';
const PROVINCE_CATEGORY_NAME = 'Tỉnh, Thành phố';
const WARD_CATEGORY_CODE = 'DM_PHUONG_XA';
const WARD_CATEGORY_NAME = 'Phường, Xã';

type Dataset = {
  source: string;
  note: string;
  fetchedAt: string;
  provinceCount: number;
  wardCount: number;
  provinces: {
    code: string;
    name: string;
    wards: { code: string; name: string }[];
  }[];
};

function loadDataset(): Dataset {
  const file = path.join(
    __dirname,
    'data',
    'vn-administrative-units.json',
  );
  const dataset = JSON.parse(readFileSync(file, 'utf8')) as Dataset;

  const wards = dataset.provinces.reduce((n, p) => n + p.wards.length, 0);
  if (
    dataset.provinces.length !== dataset.provinceCount ||
    wards !== dataset.wardCount
  ) {
    throw new Error('File dữ liệu không khớp số liệu đã ghi trong chính nó');
  }

  return dataset;
}

async function main(): Promise<void> {
  const dataset = loadDataset();
  console.log(
    `Nguồn: ${dataset.source}\n` +
      `${dataset.note}\n` +
      `Sẽ nạp ${dataset.provinceCount} tỉnh/thành và ${dataset.wardCount} phường/xã.\n`,
  );

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const sqlite = app.get(SqliteService);
  const categories = app.get(CategoriesService);
  const details = app.get(CategoryDetailsService);

  const findByCode = (code: string): Category | null =>
    categories.list().find((c) => c.code === code) ?? null;

  /**
   * Script dò danh mục theo mã, nên nếu ai đó đổi mã trong giao diện thì lần
   * chạy sau sẽ lặng lẽ tạo một danh mục thứ hai trùng tên. Dừng lại và nói rõ
   * thay vì để dữ liệu nhân đôi.
   */
  const assertNoRenamedTwin = (code: string, name: string): void => {
    if (findByCode(code)) return;

    const twin = categories.list().find((c) => c.name === name);
    if (twin) {
      throw new Error(
        `Đã có danh mục tên "${name}" nhưng mã là "${twin.code}", không phải ` +
          `"${code}". Hãy đổi mã về "${code}", hoặc sửa hằng số trong ` +
          `scripts/seed-vn-administrative.ts cho khớp.`,
      );
    }
  };

  try {
    // Cả lượt nạp nằm trong một transaction: nhanh hơn hẳn vài nghìn lần ghi
    // lẻ, và nếu lỗi giữa chừng thì DB quay về nguyên trạng.
    assertNoRenamedTwin(PROVINCE_CATEGORY_CODE, PROVINCE_CATEGORY_NAME);
    assertNoRenamedTwin(WARD_CATEGORY_CODE, WARD_CATEGORY_NAME);

    const report = sqlite.transaction(() => {
      const provinceCategory =
        findByCode(PROVINCE_CATEGORY_CODE) ??
        categories.create({
          code: PROVINCE_CATEGORY_CODE,
          name: PROVINCE_CATEGORY_NAME,
          descriptions:
            'Đơn vị hành chính cấp tỉnh của Việt Nam. ' + dataset.note,
        });

      let wardCategory = findByCode(WARD_CATEGORY_CODE);
      if (!wardCategory) {
        wardCategory = categories.create({
          code: WARD_CATEGORY_CODE,
          name: WARD_CATEGORY_NAME,
          descriptions:
            'Đơn vị hành chính cấp xã của Việt Nam, nhóm theo tỉnh/thành phố.',
          groupCategoryId: provinceCategory.id,
        });
      } else if (wardCategory.groupCategoryId !== provinceCategory.id) {
        wardCategory = categories.update(wardCategory.id, {
          groupCategoryId: provinceCategory.id,
        });
      }

      const existingProvinces = new Map(
        details.list(provinceCategory.id).map((d) => [d.code, d]),
      );
      const existingWards = new Map(
        details.list(wardCategory.id).map((d) => [d.code, d]),
      );

      let addedProvinces = 0;
      let addedWards = 0;
      let reordered = 0;

      /** Thứ tự hiển thị đánh số từ 1, không phải từ 0. */
      const orderOf = (index: number) => index + 1;

      /** Ghi `order` mới cho bản ghi đã có, nếu nó đang lệch. */
      const syncOrder = (
        categoryId: number,
        current: { id: number; order: number },
        order: number,
      ) => {
        if (current.order === order) return;
        details.update(categoryId, current.id, { order });
        reordered += 1;
      };

      sortProvinces(dataset.provinces).forEach((province, provinceIndex) => {
        const existing = existingProvinces.get(province.code);
        let provinceDetailId: number;

        if (existing) {
          provinceDetailId = existing.id;
          syncOrder(provinceCategory.id, existing, orderOf(provinceIndex));
        } else {
          provinceDetailId = details.create(provinceCategory.id, {
            code: province.code,
            name: province.name,
            order: orderOf(provinceIndex),
          }).id;
          addedProvinces += 1;
        }

        sortWards(province.wards).forEach((ward, wardIndex) => {
          const current = existingWards.get(ward.code);

          if (current) {
            syncOrder(wardCategory!.id, current, orderOf(wardIndex));
            return;
          }

          details.create(wardCategory!.id, {
            code: ward.code,
            name: ward.name,
            order: orderOf(wardIndex),
            groupDetailId: provinceDetailId,
          });
          addedWards += 1;
        });
      });

      return {
        provinceCategoryId: provinceCategory.id,
        wardCategoryId: wardCategory.id,
        addedProvinces,
        addedWards,
        reordered,
      };
    });

    // Đọc lại từ DB để báo cáo con số thật, không phải con số vừa đếm.
    const provinceTotal = details.list(report.provinceCategoryId).length;
    const wardTotal = details.list(report.wardCategoryId).length;

    console.log(
      `Thêm mới: ${report.addedProvinces} tỉnh/thành, ${report.addedWards} phường/xã.\n` +
        `Sắp lại : ${report.reordered} bản ghi.\n` +
        `Hiện có : ${provinceTotal} tỉnh/thành, ${wardTotal} phường/xã.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
