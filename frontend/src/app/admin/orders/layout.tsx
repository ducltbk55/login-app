import { requirePermission } from "@/lib/admin";

/** Mọi trang trong mục này đòi quyền xem; thao tác ghi kiểm tra riêng ở action. */
export default async function Layout({
  children,
}: LayoutProps<"/admin/orders">) {
  await requirePermission("ORDERS.READ");
  return children;
}
