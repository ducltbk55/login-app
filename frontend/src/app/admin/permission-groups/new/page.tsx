import { BackLink, PageHeader } from "@/components/admin/page-header";
import { PermissionGroupForm } from "@/components/admin/permission-group-form";
import {
  findPermissionCatalogHref,
  listPermissions,
} from "@/lib/permission-groups";
import { createPermissionGroupAction } from "../actions";

export default async function NewPermissionGroupPage() {
  const [permissions, catalogHref] = await Promise.all([
    listPermissions(),
    findPermissionCatalogHref(),
  ]);

  return (
    <div className="space-y-5">
      <BackLink href="/admin/permission-groups">Danh sách nhóm quyền</BackLink>
      <PageHeader
        title="Thêm nhóm quyền"
        description="Chọn các quyền nhóm này được phép dùng."
      />
      <PermissionGroupForm
        permissions={permissions}
        permissionCatalogHref={catalogHref}
        action={createPermissionGroupAction}
      />
    </div>
  );
}
