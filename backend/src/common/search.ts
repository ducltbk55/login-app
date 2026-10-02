import { slugify } from './slugify';

/**
 * So khớp không phân biệt hoa thường VÀ không phân biệt dấu: "duc le" khớp "Đức Lê".
 *
 * SQLite bản dựng sẵn không có ICU nên `COLLATE NOCASE` chỉ xử lý ASCII (Đ không
 * khớp đ). Vì vậy lọc ở tầng ứng dụng — danh sách trong admin đủ nhỏ; nếu sau này
 * dữ liệu lớn thì thêm cột đã chuẩn hoá và đánh index.
 */
export function matchesSearch(
  search: string,
  ...fields: (string | null | undefined)[]
): boolean {
  const needle = slugify(search);
  if (!needle) return true;

  return fields.some((field) => !!field && slugify(field).includes(needle));
}
