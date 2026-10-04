import { notFound } from "next/navigation";

import { BackLink, PageHeader } from "@/components/admin/page-header";
import { PermissionGroupForm } from "@/components/admin/permission-group-form";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import {
  findPermissionCatalogHref,
  findPermissionGroup,
  listPermissions,
} from "@/lib/permission-groups";
import { updatePermissionGroupAction } from "../actions";

export default async function EditPermissionGroupPage(
  props: PageProps<"/admin/permission-groups/[id]">,
) {
  const { id } = await props.params;
  const [group, permissions, catalogHref, user] = await Promise.all([
    findPermissionGroup(id),
    listPermissions(),
    findPermissionCatalogHref(),
    currentUser(),
  ]);

  if (!group) notFound();
  // Layout đã đòi PERMISSION-GROUPS.READ; thiếu WRITE thì chỉ xem.
  const canWrite = can(user!, "PERMISSION-GROUPS.WRITE");

  return (
    <div className="space-y-5">
      <BackLink href="/admin/permission-groups">Danh sách nhóm quyền</BackLink>
      <PageHeader
        title={canWrite ? `Sửa nhóm: ${group.name}` : `Nhóm: ${group.name}`}
        description={group.slug}
      />
      <PermissionGroupForm
        group={group}
        permissions={permissions}
        permissionCatalogHref={catalogHref}
        action={updatePermissionGroupAction.bind(null, group.id)}
        readOnly={!canWrite}
      />
    </div>
  );
}
