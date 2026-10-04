import { requirePermission } from "@/lib/admin";

/** Mọi trang trong mục này đòi quyền xem; thao tác ghi kiểm tra riêng ở action. */
export default async function Layout({
  children,
}: LayoutProps<"/admin/permission-groups">) {
  await requirePermission("PERMISSION-GROUPS.READ");
  return children;
}
