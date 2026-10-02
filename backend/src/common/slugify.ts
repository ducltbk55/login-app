/**
 * Tạo slug từ tên, xử lý được cả tiếng Việt: "Đồ gia dụng" -> "do-gia-dung".
 * NFD tách chữ và dấu, rồi xoá dải dấu tổ hợp U+0300..U+036F.
 * Riêng đ/Đ không phải dấu tổ hợp nên phải thay tay.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đ]/g, 'd')
    .replace(/[Đ]/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
