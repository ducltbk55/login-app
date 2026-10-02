import { readFileSync } from 'node:fs';
import path from 'node:path';

import { normalizeCode } from '../common/code';
import {
  provinceRank,
  sortProvinces,
  sortWards,
  wardRank,
} from './vn-administrative-order';

type Dataset = {
  source: string;
  provinceCount: number;
  wardCount: number;
  provinces: {
    code: string;
    name: string;
    wards: { code: string; name: string }[];
  }[];
};

/**
 * File dữ liệu đơn vị hành chính là đầu vào của `npm run seed:vn`. Nó được tải
 * về một lần rồi commit, nên test ở đây chỉ canh cho nó không bị hỏng/sửa nhầm.
 */
describe('scripts/data/vn-administrative-units.json', () => {
  const dataset = JSON.parse(
    readFileSync(
      path.join(
        process.cwd(),
        'scripts',
        'data',
        'vn-administrative-units.json',
      ),
      'utf8',
    ),
  ) as Dataset;

  const wards = dataset.provinces.flatMap((p) =>
    p.wards.map((w) => ({ ...w, provinceCode: p.code })),
  );

  it('khớp số liệu chính thức sau sắp xếp 01/07/2025', () => {
    expect(dataset.provinces).toHaveLength(34);
    expect(wards).toHaveLength(3321);
    expect(dataset.provinceCount).toBe(dataset.provinces.length);
    expect(dataset.wardCount).toBe(wards.length);
    expect(dataset.source).toContain('vietnamese-provinces-database');
  });

  // Từ 20/09/2026 có 9 thành phố trực thuộc trung ương: 6 thành phố cũ cộng
  // Đồng Nai, Quảng Ninh, Bắc Ninh được nâng cấp trong năm 2026.
  it('có đủ 9 thành phố trực thuộc trung ương', () => {
    const cities = dataset.provinces.filter((p) =>
      p.name.startsWith('Thành phố'),
    );

    // So bằng tập hợp: `.sort()` của JS xếp theo mã UTF-16 nên thứ tự tên
    // tiếng Việt không giống thứ tự bảng chữ cái.
    expect(new Set(cities.map((c) => c.name))).toEqual(
      new Set([
        'Thành phố Hà Nội',
        'Thành phố Hải Phòng',
        'Thành phố Huế',
        'Thành phố Đà Nẵng',
        'Thành phố Hồ Chí Minh',
        'Thành phố Cần Thơ',
        'Thành phố Đồng Nai',
        'Thành phố Quảng Ninh',
        'Thành phố Bắc Ninh',
      ]),
    );
  });

  it('25 đơn vị còn lại là tỉnh', () => {
    const provinces = dataset.provinces.filter((p) =>
      p.name.startsWith('Tỉnh'),
    );
    expect(provinces).toHaveLength(25);
    // Không có đơn vị nào lạc tên.
    expect(dataset.provinces.length).toBe(provinces.length + 9);
  });

  it('mã tỉnh và mã xã đều duy nhất', () => {
    const provinceCodes = dataset.provinces.map((p) => p.code);
    const wardCodes = wards.map((w) => w.code);

    expect(new Set(provinceCodes).size).toBe(provinceCodes.length);
    // Mã xã duy nhất toàn quốc nên cũng duy nhất trong một danh mục.
    expect(new Set(wardCodes).size).toBe(wardCodes.length);
  });

  it('mã giữ nguyên sau khi chuẩn hoá nên nạp vào là khớp', () => {
    for (const province of dataset.provinces) {
      expect(normalizeCode(province.code)).toBe(province.code);
    }
    for (const ward of wards) {
      expect(normalizeCode(ward.code)).toBe(ward.code);
    }
  });

  it('tỉnh nào cũng có xã, tên không rỗng', () => {
    for (const province of dataset.provinces) {
      expect(province.wards.length).toBeGreaterThan(0);
      expect(province.name.trim()).not.toBe('');
      for (const ward of province.wards) {
        expect(ward.name.trim()).not.toBe('');
      }
    }
  });
});

describe('quy tắc sắp xếp đơn vị hành chính', () => {
  const dataset = JSON.parse(
    readFileSync(
      path.join(
        process.cwd(),
        'scripts',
        'data',
        'vn-administrative-units.json',
      ),
      'utf8',
    ),
  ) as Dataset;

  it('tỉnh/thành: thành phố trước, rồi tỉnh, mỗi loại theo tên', () => {
    const sorted = sortProvinces(dataset.provinces);

    // 9 thành phố trực thuộc trung ương đứng đầu.
    expect(sorted.slice(0, 9).every((p) => provinceRank(p.name) === 0)).toBe(
      true,
    );
    expect(sorted.slice(9).every((p) => provinceRank(p.name) === 1)).toBe(true);

    expect(sorted.slice(0, 4).map((p) => p.name)).toEqual([
      'Thành phố Bắc Ninh',
      'Thành phố Cần Thơ',
      'Thành phố Đà Nẵng',
      'Thành phố Đồng Nai',
    ]);
    // Đ xếp sau D và sau C — đúng bảng chữ cái tiếng Việt, không phải UTF-16.
    expect(sorted[9].name).toBe('Tỉnh An Giang');
    expect(sorted[sorted.length - 1].name).toBe('Tỉnh Vĩnh Long');
  });

  it('phường/xã: phường trước xã trước đặc khu, mỗi loại theo tên', () => {
    const daNang = dataset.provinces.find(
      (p) => p.name === 'Thành phố Đà Nẵng',
    )!;
    const sorted = sortWards(daNang.wards);

    const ranks = sorted.map((w) => wardRank(w.name));
    // Thứ hạng không bao giờ giảm => các loại nằm liền khối, đúng trật tự.
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(sorted[0].name.startsWith('Phường')).toBe(true);
    expect(sorted[sorted.length - 1].name).toBe('Đặc khu Hoàng Sa');
  });

  it('mọi tỉnh đều sắp được, không có tên lạ ngoài 3 loại', () => {
    for (const province of dataset.provinces) {
      for (const ward of province.wards) {
        expect(wardRank(ward.name)).toBeLessThan(3);
      }
    }
  });

  it('sắp xếp không làm mất hay nhân bản bản ghi', () => {
    for (const province of dataset.provinces) {
      const sorted = sortWards(province.wards);
      expect(sorted).toHaveLength(province.wards.length);
      expect(new Set(sorted.map((w) => w.code)).size).toBe(sorted.length);
    }
  });
});
