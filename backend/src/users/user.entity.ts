export const USER_ROLES = ['admin', 'user'] as const;
export const USER_STATUSES = ['active', 'blocked'] as const;

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

export type SyncResult = {
  user: User;
  isNewUser: boolean;
};

export type UserStats = {
  total: number;
  admins: number;
  blocked: number;
};
