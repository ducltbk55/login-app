export type PermissionGroup = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  /** Số người dùng đang được gán nhóm này. */
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};
