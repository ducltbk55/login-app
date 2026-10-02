export const USER_GENDERS = ['male', 'female', 'other'] as const;
export type UserGender = (typeof USER_GENDERS)[number];

export const USER_ROLES = ['admin', 'user'] as const;
/**
 * `inactive` = vừa đăng ký, chờ quản trị viên duyệt; `blocked` = bị khoá.
 * Cả hai đều không đăng nhập được, nhưng ý nghĩa khác nhau nên tách riêng.
 */
export const USER_STATUSES = ['active', 'inactive', 'blocked'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export type User = {
  /** Khoá chính số, tự tăng. */
  id: number;
  /** GUID định danh tài khoản — chính là cột `id` kiểu TEXT ở schema cũ. */
  accountId: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;

  /* ---- hồ sơ do người dùng tự khai sau khi đăng nhập ---- */
  phone: string | null;
  gender: UserGender | null;
  /** `YYYY-MM-DD`. */
  birthDate: string | null;
  /** Số nhà, tên đường. */
  addressLine: string | null;
  /** Mã chi tiết trong danh mục Tỉnh/Thành phố. */
  provinceCode: string | null;
  /** Mã chi tiết trong danh mục Phường/Xã. */
  wardCode: string | null;
  /** Đã khai đủ các trường bắt buộc chưa — suy ra, không lưu trong DB. */
  profileCompleted: boolean;
};

/** Nhóm quyền ở dạng gọn để nhúng vào bản ghi người dùng. */
export type UserGroupRef = {
  id: number;
  name: string;
  slug: string;
};

/** Bản ghi đầy đủ cho trang chi tiết trong admin. */
export type UserDetail = User & {
  groups: UserGroupRef[];
  /** Hợp của quyền từ các nhóm; role `admin` được coi là có toàn bộ quyền. */
  permissions: string[];
};

export type LoginEvent = {
  id: number;
  userId: number;
  provider: string;
  occurredAt: string;
};

/** Đăng nhập hay đăng ký — hai luồng khác nhau, không gộp làm một. */
export const SYNC_MODES = ['login', 'register'] as const;
export type SyncMode = (typeof SYNC_MODES)[number];

export type SyncResult = {
  user: User;
  isNewUser: boolean;
};

export type UserStats = {
  total: number;
  admins: number;
  /** Đang chờ duyệt (status = inactive). */
  pending: number;
  blocked: number;
};
