/**
 * Danh mục quyền cố định của hệ thống. Permission group chỉ được chứa các key ở đây,
 * nhờ vậy không bao giờ có quyền "rác" trong DB và UI luôn render được nhãn tiếng Việt.
 */
export const PERMISSIONS = [
  { key: 'users.read', group: 'Người dùng', label: 'Xem danh sách người dùng' },
  {
    key: 'users.write',
    group: 'Người dùng',
    label: 'Sửa vai trò / trạng thái',
  },
  { key: 'categories.read', group: 'Danh mục', label: 'Xem danh mục' },
  {
    key: 'categories.write',
    group: 'Danh mục',
    label: 'Thêm / sửa / xoá danh mục',
  },
  {
    key: 'permission-groups.read',
    group: 'Nhóm quyền',
    label: 'Xem nhóm quyền',
  },
  {
    key: 'permission-groups.write',
    group: 'Nhóm quyền',
    label: 'Thêm / sửa / xoá nhóm quyền',
  },
] as const;

export type Permission = (typeof PERMISSIONS)[number]['key'];

export const PERMISSION_KEYS: string[] = PERMISSIONS.map((p) => p.key);
