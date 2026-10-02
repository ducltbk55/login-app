import Link from "next/link";

import { PermissionGroupForm } from "@/components/admin/permission-group-form";
import { listPermissions } from "@/lib/permission-groups";
import { createPermissionGroupAction } from "../actions";

export default async function NewPermissionGroupPage() {
  const permissions = await listPermissions();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/permission-groups"
        className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
      >
        ← Danh sách nhóm quyền
      </Link>
      <h2 className="text-base font-semibold">Thêm nhóm quyền</h2>
      <PermissionGroupForm
        permissions={permissions}
        action={createPermissionGroupAction}
      />
    </div>
  );
}
