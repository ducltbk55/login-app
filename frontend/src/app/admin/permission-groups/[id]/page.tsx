import Link from "next/link";
import { notFound } from "next/navigation";

import { PermissionGroupForm } from "@/components/admin/permission-group-form";
import {
  findPermissionGroup,
  listPermissions,
} from "@/lib/permission-groups";
import { updatePermissionGroupAction } from "../actions";

export default async function EditPermissionGroupPage(
  props: PageProps<"/admin/permission-groups/[id]">,
) {
  const { id } = await props.params;
  const [group, permissions] = await Promise.all([
    findPermissionGroup(id),
    listPermissions(),
  ]);

  if (!group) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/permission-groups"
        className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
      >
        ← Danh sách nhóm quyền
      </Link>
      <h2 className="text-base font-semibold">Sửa nhóm: {group.name}</h2>
      <PermissionGroupForm
        group={group}
        permissions={permissions}
        action={updatePermissionGroupAction.bind(null, group.id)}
      />
    </div>
  );
}
