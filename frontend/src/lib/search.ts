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

/**
 * Khớp khi MỌI từ gõ vào đều có mặt, không cần liền nhau hay đúng thứ tự:
 * "3 5" khớp "3 – 5 năm", "nang da" khớp "Đà Nẵng". Gõ nguyên cụm vẫn khớp
 * như trước — tách từ chỉ nới rộng chứ không bớt kết quả nào.
 */
export function matchesSearch(needle: string, ...fields: string[]): boolean {
  const words = normalizeForSearch(needle)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return true;

  const haystack = fields.map(normalizeForSearch).join(" ");
  return words.every((word) => haystack.includes(word));
}
