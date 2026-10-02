import { notFound } from "next/navigation";

import { BackLink, PageHeader } from "@/components/admin/page-header";
import { PermissionGroupForm } from "@/components/admin/permission-group-form";
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
  const [group, permissions, catalogHref] = await Promise.all([
    findPermissionGroup(id),
    listPermissions(),
    findPermissionCatalogHref(),
  ]);

  if (!group) notFound();

  return (
    <div className="space-y-5">
      <BackLink href="/admin/permission-groups">Danh sách nhóm quyền</BackLink>
      <PageHeader title={`Sửa nhóm: ${group.name}`} description={group.slug} />
      <PermissionGroupForm
        group={group}
        permissions={permissions}
        permissionCatalogHref={catalogHref}
        action={updatePermissionGroupAction.bind(null, group.id)}
      />
    </div>
  );
}
