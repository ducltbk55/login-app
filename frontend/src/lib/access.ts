/**
 * Quy tắc phân quyền khu quản trị — hàm thuần, dùng được ở cả server lẫn client.
 *
 * Mã quyền có dạng `<CHỨC_NĂNG>.<HÀNH_ĐỘNG>` (vd. `ARTICLES.WRITE`), là code
 * chi tiết của danh mục quyền `DM_QUYEN` bên backend. `role = admin` được coi
 * là có mọi quyền, khỏi phải tự gán nhóm cho mình.
 */

export type Permission =
  | "USERS.READ"
  | "USERS.WRITE"
  | "CATEGORIES.READ"
  | "CATEGORIES.WRITE"
  | "PERMISSION-GROUPS.READ"
  | "PERMISSION-GROUPS.WRITE"
  | "ARTICLES.READ"
  | "ARTICLES.WRITE"
  | "ARTICLES.PUBLISH"
  | "CONTACTS.READ"
  | "CONTACTS.WRITE"
  | "PRODUCTS.READ"
  | "PRODUCTS.WRITE"
  | "PRODUCTS.PUBLISH"
  | "ORDERS.READ"
  | "ORDERS.WRITE"
  | "ORDERS.PAYMENT"
  | "RECRUITMENT.READ"
  | "RECRUITMENT.WRITE"
  | "CANDIDATES.READ"
  | "CANDIDATES.WRITE";

/** Phần của bản ghi người dùng mà việc phân quyền cần tới. */
export type AccessSubject = {
  role: string;
  status: string;
  permissions: string[];
};

/** Mã chức năng của một quyền: `ARTICLES.WRITE` -> `ARTICLES`. */
export function functionOf(permission: string): string {
  const dot = permission.indexOf(".");
  return dot > 0 ? permission.slice(0, dot) : permission;
}

export function isSuperAdmin(user: AccessSubject): boolean {
  return user.role === "admin" && user.status === "active";
}

/** Có quyền `permission` không. Tài khoản chờ duyệt/bị khoá không có quyền gì. */
export function can(user: AccessSubject, permission: Permission): boolean {
  if (user.status !== "active") return false;
  return user.role === "admin" || user.permissions.includes(permission);
}

/** Được vào khu /admin: là admin, hoặc có ít nhất một quyền qua nhóm quyền. */
export function canEnterAdmin(user: AccessSubject): boolean {
  if (user.status !== "active") return false;
  return user.role === "admin" || user.permissions.length > 0;
}

/**
 * Các mục quản trị, mỗi mục ứng với một chức năng (chi tiết của danh mục
 * chức năng `DM_CHUC_NANG`). Mục hiện trên menu khi có quyền `.READ` của nó.
 */
export const ADMIN_SECTIONS = [
  { code: "USERS", href: "/admin/users", label: "Người dùng" },
  { code: "ARTICLES", href: "/admin/articles", label: "Bài viết" },
  { code: "PRODUCTS", href: "/admin/products", label: "Sản phẩm" },
  { code: "ORDERS", href: "/admin/orders", label: "Đơn hàng" },
  { code: "CATEGORIES", href: "/admin/categories", label: "Danh mục" },
  { code: "CONTACTS", href: "/admin/contacts", label: "Liên hệ" },
  { code: "RECRUITMENT", href: "/admin/recruitment", label: "Tuyển dụng" },
  { code: "CANDIDATES", href: "/admin/candidates", label: "Ứng viên" },
  {
    code: "PERMISSION-GROUPS",
    href: "/admin/permission-groups",
    label: "Nhóm quyền",
  },
] as const;

export type AdminSectionCode = (typeof ADMIN_SECTIONS)[number]["code"];

export type AdminMenuItem = {
  code: AdminSectionCode;
  href: string;
  label: string;
};

/** Một chức năng đọc từ backend (`GET /permissions/functions`). */
export type FunctionDef = { code: string; label: string; order: number };

/**
 * Menu quản trị của một người dùng, dựng theo danh mục chức năng: tên và thứ
 * tự lấy từ `functions` (admin đổi trong Danh mục là menu đổi theo, tắt chức
 * năng là mục biến mất), chỉ giữ mục người dùng có quyền xem.
 *
 * `functions = null` (không đọc được danh mục) thì rơi về thứ tự mặc định để
 * menu không trống trơn chỉ vì một lỗi đọc.
 */
export function buildAdminMenu(
  user: AccessSubject,
  functions: FunctionDef[] | null,
): AdminMenuItem[] {
  const ordered: AdminMenuItem[] =
    functions === null
      ? ADMIN_SECTIONS.map(({ code, href, label }) => ({ code, href, label }))
      : functions.flatMap((fn) => {
          const section = ADMIN_SECTIONS.find((s) => s.code === fn.code);
          return section
            ? [{ code: section.code, href: section.href, label: fn.label }]
            : []; // chức năng admin tự thêm nhưng chưa có trang quản trị
        });

  return ordered.filter((item) => can(user, `${item.code}.READ` as Permission));
}
