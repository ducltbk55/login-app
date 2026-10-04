/**
 * Danh mục quyền của hệ thống được lưu trong DB dưới dạng hai danh mục lồng nhau:
 *
 *   "Danh mục chức năng" (DM_CHUC_NANG)
 *     └─ chi tiết: Người dùng, Danh mục, Nhóm quyền ...
 *   "Danh mục quyền"     (DM_QUYEN)  ──  lấy danh mục trên làm nhóm
 *     └─ chi tiết: USERS.READ, USERS.WRITE ...  mỗi quyền thuộc một chức năng
 *
 * Nhờ vậy nhãn nhóm hiển thị trên form là tên tiếng Việt lấy từ dữ liệu, và
 * admin thêm chức năng / quyền mới ngay trong màn Danh mục.
 *
 * Danh sách dưới đây chỉ là hạt giống: lúc khởi động, cái nào chưa có trong DB
 * thì được chèn vào, còn những gì admin đã sửa thì giữ nguyên.
 */
export const FUNCTION_CATEGORY_CODE = 'DM_CHUC_NANG';
export const FUNCTION_CATEGORY_NAME = 'Danh mục chức năng';
export const FUNCTION_CATEGORY_DESCRIPTION =
  'Các mảng chức năng của hệ thống, dùng để phân nhóm quyền.';

export const PERMISSION_CATEGORY_CODE = 'DM_QUYEN';
export const PERMISSION_CATEGORY_NAME = 'Danh mục quyền';
export const PERMISSION_CATEGORY_DESCRIPTION =
  'Mỗi chi tiết là một quyền của hệ thống. Mã chi tiết chính là mã quyền ' +
  'được gán cho nhóm quyền.';

export type FunctionSeed = { code: string; label: string };

export const FUNCTION_SEEDS: FunctionSeed[] = [
  { code: 'USERS', label: 'Người dùng' },
  { code: 'CATEGORIES', label: 'Danh mục' },
  { code: 'PERMISSION-GROUPS', label: 'Nhóm quyền' },
  { code: 'ARTICLES', label: 'Bài viết' },
  { code: 'CONTACTS', label: 'Liên hệ' },
  { code: 'PRODUCTS', label: 'Sản phẩm' },
  { code: 'ORDERS', label: 'Đơn hàng' },
];

export type PermissionSeed = {
  /** Mã quyền, cũng là `code` của chi tiết danh mục quyền. */
  code: string;
  /** Nhãn tiếng Việt, lưu vào `name` của chi tiết. */
  label: string;
  /** Mã chức năng mà quyền này thuộc về. */
  functionCode: string;
};

export const PERMISSION_SEEDS: PermissionSeed[] = [
  {
    code: 'USERS.READ',
    label: 'Xem danh sách người dùng',
    functionCode: 'USERS',
  },
  {
    code: 'USERS.WRITE',
    label: 'Sửa vai trò / trạng thái',
    functionCode: 'USERS',
  },
  {
    code: 'CATEGORIES.READ',
    label: 'Xem danh mục',
    functionCode: 'CATEGORIES',
  },
  {
    code: 'CATEGORIES.WRITE',
    label: 'Thêm / sửa / xoá danh mục',
    functionCode: 'CATEGORIES',
  },
  {
    code: 'PERMISSION-GROUPS.READ',
    label: 'Xem nhóm quyền',
    functionCode: 'PERMISSION-GROUPS',
  },
  {
    code: 'PERMISSION-GROUPS.WRITE',
    label: 'Thêm / sửa / xoá nhóm quyền',
    functionCode: 'PERMISSION-GROUPS',
  },
  {
    code: 'ARTICLES.READ',
    label: 'Xem bài viết',
    functionCode: 'ARTICLES',
  },
  {
    code: 'ARTICLES.WRITE',
    label: 'Thêm / sửa / xoá bài viết',
    functionCode: 'ARTICLES',
  },
  {
    code: 'ARTICLES.PUBLISH',
    label: 'Xuất bản / gỡ bài viết',
    functionCode: 'ARTICLES',
  },
  {
    code: 'CONTACTS.READ',
    label: 'Xem yêu cầu liên hệ',
    functionCode: 'CONTACTS',
  },
  {
    code: 'CONTACTS.WRITE',
    label: 'Đổi trạng thái / xoá liên hệ',
    functionCode: 'CONTACTS',
  },
  {
    code: 'PRODUCTS.READ',
    label: 'Xem sản phẩm',
    functionCode: 'PRODUCTS',
  },
  {
    code: 'PRODUCTS.WRITE',
    label: 'Thêm / sửa / xoá sản phẩm',
    functionCode: 'PRODUCTS',
  },
  {
    code: 'PRODUCTS.PUBLISH',
    label: 'Mở bán / ngừng bán sản phẩm',
    functionCode: 'PRODUCTS',
  },
  {
    code: 'ORDERS.READ',
    label: 'Xem đơn hàng',
    functionCode: 'ORDERS',
  },
  {
    code: 'ORDERS.WRITE',
    label: 'Xử lý đơn hàng (xác nhận, giao, huỷ, ghi chú)',
    functionCode: 'ORDERS',
  },
  {
    code: 'ORDERS.PAYMENT',
    label: 'Cập nhật thanh toán đơn hàng',
    functionCode: 'ORDERS',
  },
];

/** Một chức năng (mục menu quản trị) đọc ra từ DB. */
export type FunctionDef = {
  /** Mã chức năng, là tiền tố của mã quyền: `ARTICLES` -> `ARTICLES.READ`. */
  code: string;
  label: string;
  order: number;
};

/** Một quyền đọc ra từ DB, dạng mà trang admin dùng để render checkbox. */
export type PermissionDef = {
  key: string;
  /** Tên chức năng (chi tiết của danh mục chức năng) dùng làm tiêu đề nhóm. */
  group: string;
  label: string;
  description: string | null;
};

/**
 * Nhãn nhóm dự phòng cho quyền chưa được phân nhóm: `USERS.READ` -> `USERS`.
 * Dữ liệu seed luôn có nhóm, nhưng chi tiết cũ thì có thể chưa.
 */
export function permissionGroupOf(code: string): string {
  const dot = code.indexOf('.');
  return dot > 0 ? code.slice(0, dot) : code;
}
