/**
 * So khớp không phân biệt hoa thường VÀ không phân biệt dấu: "ha noi" khớp
 * "Hà Nội". Dùng cho các ô chọn có tìm kiếm ở client.
 *
 * NFD tách chữ và dấu rồi xoá dải dấu tổ hợp U+0300..U+036F; riêng đ/Đ không
 * phải dấu tổ hợp nên phải thay tay. Cùng cách làm với `slugify` của backend.
 */
export function normalizeForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

export function matchesSearch(needle: string, ...fields: string[]): boolean {
  const query = normalizeForSearch(needle);
  if (!query) return true;

  return fields.some((field) => normalizeForSearch(field).includes(query));
}
