/**
 * Trạng thái bài viết.
 *
 * Tách `draft` khỏi `archived` vì hai thứ khác hẳn nhau: nháp là chưa từng ra
 * mắt, lưu trữ là đã đăng rồi gỡ xuống. Cả hai đều không hiện ở trang ngoài,
 * nhưng admin cần phân biệt để biết bài nào còn dở, bài nào đã xong đời.
 */
export const ARTICLE_STATUSES = ['draft', 'published', 'archived'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

/** Chuyên mục hiển thị kèm bài, đọc sẵn để khỏi gọi thêm một vòng. */
export type ArticleCategoryRef = {
  id: number;
  code: string;
  name: string;
};

export type Article = {
  id: number;
  /** Chi tiết của danh mục `DM_CHUYEN_MUC`. */
  categoryDetailId: number;
  category: ArticleCategoryRef | null;
  /** Đường dẫn trên trang ngoài: /tin-tuc/<slug>. Duy nhất toàn bảng. */
  slug: string;
  title: string;
  /** Sapo hiển thị ở danh sách và thẻ chia sẻ. */
  summary: string | null;
  content: string;
  /** URL ảnh bìa. Để trống thì trang ngoài hiện khối màu thay thế. */
  coverImage: string | null;
  author: string;
  /** ISO. `null` khi còn là bản nháp chưa định ngày. */
  publishedAt: string | null;
  status: ArticleStatus;
  /** Bài nổi bật, đẩy lên đầu trang Tin tức. */
  featured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;

  /* ---- suy ra lúc đọc, không lưu thành cột ---- */

  /** Số phút đọc ước lượng từ độ dài nội dung. */
  readingMinutes: number;
  /**
   * Có đang hiển thị ở trang ngoài không: đã xuất bản VÀ tới giờ đăng.
   * Đặt lịch đăng trước là chuyện bình thường của một toà soạn, nên bài
   * `published` với `publishedAt` ở tương lai vẫn chưa được tính là lên sóng.
   */
  live: boolean;
};

/** Từ mỗi phút, lấy mức đọc tiếng Việt thường gặp. */
const WORDS_PER_MINUTE = 200;

export function readingMinutesOf(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
