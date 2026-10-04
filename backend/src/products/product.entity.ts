/**
 * Trạng thái sản phẩm.
 *
 * `draft` là đang soạn, chưa từng lên trang; `archived` là đã bán rồi ngừng.
 * Cả hai đều không hiện ở trang ngoài, nhưng admin cần phân biệt món còn dở
 * với món đã thôi kinh doanh.
 */
export const PRODUCT_STATUSES = ['draft', 'published', 'archived'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/**
 * Cách sắp xếp danh sách. Sản phẩm chưa có ngày ra mắt dùng ngày tạo thay
 * thế; sản phẩm chưa có giá ("Liên hệ") luôn nằm cuối khi sắp theo giá.
 */
export const PRODUCT_SORTS = [
  'launch-desc',
  'launch-asc',
  'price-asc',
  'price-desc',
  'updated-desc',
] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

/** Lĩnh vực hiển thị kèm sản phẩm, đọc sẵn để khỏi gọi thêm một vòng. */
export type ProductCategoryRef = {
  id: number;
  code: string;
  name: string;
};

export type Product = {
  id: number;
  /** Chi tiết của danh mục `DM_LINH_VUC_SP`. */
  categoryDetailId: number;
  category: ProductCategoryRef | null;
  /** Đường dẫn trên trang ngoài: /san-pham/<slug>. Duy nhất toàn bảng. */
  slug: string;
  name: string;
  /** Mã sản phẩm nội bộ, tuỳ chọn, duy nhất nếu có. */
  sku: string | null;
  /** Tóm tắt ngắn, hiện dưới ảnh ở danh sách. */
  summary: string | null;
  /** Mô tả chi tiết: HTML từ CKEditor, đã lọc (xem articles/article-content.ts). */
  description: string | null;
  /** URL ảnh đại diện: link ngoài hoặc ảnh đã tải lên /media/products/... */
  image: string | null;
  /**
   * Bộ sưu tập ảnh, theo thứ tự hiển thị. Có ảnh thì trang chi tiết chạy
   * slideshow các ảnh này; rỗng thì hiện ảnh đại diện.
   */
  gallery: string[];
  /**
   * Thông số kỹ thuật riêng của từng sản phẩm, đúng thứ tự admin sắp. Mảng
   * cặp nhãn–giá trị thay vì object `{ "Camera": "200MP" }`: giữ được thứ tự
   * hiển thị, và đổi tên một nhãn không làm xáo trộn các dòng khác.
   */
  specs: ProductSpec[];
  /**
   * Link video giới thiệu (YouTube, Vimeo hoặc file .mp4/.webm), đã kiểm tra
   * bằng `parseVideoUrl`. Có thì trang chi tiết thêm tab "Video".
   */
  videoUrl: string | null;
  /** Giá niêm yết, VNĐ. `null` = chưa công bố giá, trang ngoài hiện "Liên hệ". */
  price: number | null;
  /** Giá khuyến mãi, VNĐ. Luôn nhỏ hơn giá niêm yết nếu có. */
  salePrice: number | null;
  /** Ngày ra mắt (ISO). */
  launchedAt: string | null;
  status: ProductStatus;
  /** Còn hàng. Hết hàng thì trang ngoài vẫn hiện nhưng không cho đặt. */
  inStock: boolean;
  createdAt: string;
  updatedAt: string;

  /* ---- suy ra lúc đọc, không lưu thành cột ---- */

  /** Giá khách thực trả: giá khuyến mãi nếu có, không thì giá niêm yết. */
  effectivePrice: number | null;
  /** % giảm, làm tròn. `null` khi không khuyến mãi. */
  discountPercent: number | null;
  /** Đang hiển thị ở trang ngoài. */
  live: boolean;
};

/** Một dòng thông số, vd. `{ label: "Camera", value: "200MP" }`. */
export type ProductSpec = { label: string; value: string };

/** Giới hạn bảng thông số — đủ cho máy tính/điện thoại chi tiết nhất. */
export const MAX_SPECS = 60;
export const MAX_SPEC_LABEL = 80;
export const MAX_SPEC_VALUE = 500;

/** Đủ cho một slideshow; nhiều hơn nữa thì trang chi tiết nặng vô ích. */
export const MAX_GALLERY_IMAGES = 20;

/** Giá trị trần của ô giá trên form — đủ cho mọi sản phẩm phần mềm/dịch vụ. */
export const MAX_PRICE = 1_000_000_000_000;

export function discountPercentOf(
  price: number | null,
  salePrice: number | null,
): number | null {
  if (price === null || salePrice === null || price <= 0) return null;
  if (salePrice >= price) return null;
  // Tối thiểu 1%: giảm 0,4% mà hiện "-0%" thì vô nghĩa.
  return Math.max(1, Math.round(((price - salePrice) / price) * 100));
}
