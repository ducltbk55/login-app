/** Dùng chung cho cả danh mục và chi tiết danh mục. */
export type CategoryStatus = 'active' | 'inactive';

export const CATEGORY_STATUSES: CategoryStatus[] = ['active', 'inactive'];

/** Tham chiếu gọn tới danh mục / chi tiết đang đóng vai trò "nhóm". */
export type GroupRef = { id: number; code: string; name: string };

export type Category = {
  id: number;
  code: string;
  name: string;
  descriptions: string | null;
  order: number;
  status: CategoryStatus;
  /**
   * Danh mục được dùng làm nhóm cho các chi tiết của danh mục này.
   *
   * Ví dụ: "Phường/Xã" lấy "Tỉnh" làm nhóm, khi đó mỗi phường phải thuộc về
   * một tỉnh. `null` nghĩa là chi tiết không phân nhóm.
   */
  groupCategoryId: number | null;
  createdAt: string;
  updatedAt: string;
};

/** Bản ghi danh mục kèm số chi tiết và thông tin danh mục nhóm. */
export type CategorySummary = Category & {
  detailCount: number;
  groupCategory: GroupRef | null;
};

export type CategoryDetail = {
  id: number;
  categoryId: number;
  code: string;
  name: string;
  descriptions: string | null;
  order: number;
  status: CategoryStatus;
  /** Chi tiết (thuộc danh mục nhóm) mà bản ghi này được xếp vào. */
  groupDetailId: number | null;
  /** Thông tin hiển thị của nhóm, đọc kèm để khỏi gọi thêm một vòng. */
  group: GroupRef | null;
  createdAt: string;
  updatedAt: string;
};
