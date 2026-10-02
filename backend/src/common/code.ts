/**
 * Chuẩn hoá mã (`code`) của danh mục và chi tiết danh mục.
 *
 * Bỏ dấu tiếng Việt rồi viết hoa, chỉ giữ A-Z 0-9 _ - và dấu chấm. Nhờ chuẩn
 * hoá trước
 * khi lưu nên so trùng luôn nhất quán: "do-gia-dung" và "DO_GIA_DUNG" không bị
 * coi là hai mã khác nhau về hoa thường.
 */
export function normalizeCode(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_.-]+/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
}
