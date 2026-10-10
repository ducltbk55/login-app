import { requirePermission } from "@/lib/admin";

/**
 * Hồ sơ ứng viên là dữ liệu cá nhân: mọi trang trong mục đòi quyền xem riêng,
 * không thừa hưởng quyền của mục Tuyển dụng.
 */
export default async function Layout({
  children,
}: LayoutProps<"/admin/candidates">) {
  await requirePermission("CANDIDATES.READ");
  return children;
}
