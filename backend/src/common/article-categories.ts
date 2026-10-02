/**
 * Chuyên mục bài viết được lưu như một danh mục bình thường (`DM_CHUYEN_MUC`),
 * mỗi chuyên mục là một chi tiết của nó.
 *
 * Cố ý không làm bảng riêng: admin thêm/sửa/tắt chuyên mục ngay trong màn
 * Danh mục đã có, không phải viết thêm màn hình quản trị nào. Đây cũng là cách
 * danh mục quyền đang dùng (xem `common/permissions.ts`).
 *
 * Danh sách dưới đây chỉ là hạt giống: lúc khởi động cái nào thiếu thì chèn
 * thêm, còn những gì admin đã sửa thì giữ nguyên.
 */
export const ARTICLE_CATEGORY_CODE = 'DM_CHUYEN_MUC';
export const ARTICLE_CATEGORY_NAME = 'Danh mục chuyên mục';
export const ARTICLE_CATEGORY_DESCRIPTION =
  'Chuyên mục của chức năng bài viết. Mỗi chi tiết là một chuyên mục để ' +
  'phân loại tin bài trên trang Tin tức.';

export type ArticleCategorySeed = { code: string; name: string };

export const ARTICLE_CATEGORY_SEEDS: ArticleCategorySeed[] = [
  { code: 'TIN_NOI_BO', name: 'Tin nội bộ' },
  { code: 'HOAT_DONG_KHACH_HANG', name: 'Hoạt động khách hàng' },
  { code: 'TIN_CONG_NGHE', name: 'Tin công nghệ' },
  { code: 'CONG_NGHE_THE_GIOI', name: 'Công nghệ thế giới' },
];
