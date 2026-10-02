/**
 * Quy tắc sắp xếp danh mục đơn vị hành chính Việt Nam.
 *
 * Nằm trong `src/` thay vì cạnh script seed để test được và được lint phủ —
 * `scripts/seed-vn-administrative.ts` import từ đây.
 */

/**
 * So sánh tên tiếng Việt đúng thứ tự bảng chữ cái (A < Ă < Â < B, Đ sau D...).
 * `.sort()` mặc định so theo mã UTF-16 nên "Huế" lại đứng trước "Hà Nội".
 */
const vietnameseCollator = new Intl.Collator('vi');

const byVietnameseName = (a: string, b: string): number =>
  vietnameseCollator.compare(a, b);

/** Thành phố trực thuộc trung ương (0) xếp trước tỉnh (1). */
export function provinceRank(name: string): number {
  return /^thành phố/i.test(name) ? 0 : 1;
}

/**
 * Phường (0) trước xã (1) trước đặc khu (2).
 *
 * Bỏ qua hoa thường vì nguồn dữ liệu có một bản ghi viết thường
 * ("xã Bắc Sơn" ở Lạng Sơn).
 */
export function wardRank(name: string): number {
  if (/^phường/i.test(name)) return 0;
  if (/^xã/i.test(name)) return 1;
  if (/^đặc khu/i.test(name)) return 2;
  return 3;
}

function sortBy<T extends { name: string }>(
  items: T[],
  rank: (name: string) => number,
): T[] {
  return [...items].sort(
    (a, b) => rank(a.name) - rank(b.name) || byVietnameseName(a.name, b.name),
  );
}

/** Thành phố trước, rồi tỉnh; mỗi loại sắp theo tên. */
export function sortProvinces<T extends { name: string }>(provinces: T[]): T[] {
  return sortBy(provinces, provinceRank);
}

/** Trong một tỉnh: phường, xã, đặc khu; mỗi loại sắp theo tên. */
export function sortWards<T extends { name: string }>(wards: T[]): T[] {
  return sortBy(wards, wardRank);
}
