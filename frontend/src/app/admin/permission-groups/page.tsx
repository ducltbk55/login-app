import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/badge";
import { listPermissionGroups } from "@/lib/permission-groups";
import { BUTTON, TABLE } from "@/lib/styles";
import { deletePermissionGroupAction } from "./actions";

export default async function AdminPermissionGroupsPage() {
  const groups = await listPermissionGroups();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Nhóm quyền</h2>
          <p className="text-sm opacity-60">
            Gán nhóm cho người dùng ở trang chi tiết của họ. Xoá nhóm sẽ tự bỏ
            khỏi mọi người dùng.
          </p>
        </div>
        <Link href="/admin/permission-groups/new" className={BUTTON.primary}>
          + Thêm nhóm
        </Link>
      </div>

      <div className={TABLE.wrapper}>
        <table className={TABLE.table}>
          <thead>
            <tr>
              <th className={TABLE.th}>Nhóm</th>
              <th className={TABLE.th}>Quyền</th>
              <th className={TABLE.th}>Thành viên</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id}>
                <td className={TABLE.td}>
                  <span className="block font-medium">{group.name}</span>
                  <code className="block text-xs opacity-60">
                    {group.slug}
                  </code>
                  {group.description && (
                    <span className="mt-1 block text-xs opacity-60">
                      {group.description}
                    </span>
                  )}
                </td>
                <td className={TABLE.td}>
                  {group.permissions.length === 0 ? (
                    <span className="text-xs opacity-60">không có quyền</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {group.permissions.map((permission) => (
                        <code
                          key={permission}
                          className="rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10"
                        >
                          {permission}
                        </code>
                      ))}
                    </div>
                  )}
                </td>
                <td className={TABLE.td}>
                  <Badge tone={group.memberCount > 0 ? "info" : "neutral"}>
                    {group.memberCount}
                  </Badge>
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/permission-groups/${group.id}`}
                      className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
                    >
                      Sửa
                    </Link>
                    <DeleteButton
                      id={group.id}
                      action={deletePermissionGroupAction}
                      confirmText={`Xoá nhóm "${group.name}"? ${group.memberCount} người dùng sẽ mất quyền từ nhóm này.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={4} className={TABLE.empty}>
                  Chưa có nhóm quyền nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
