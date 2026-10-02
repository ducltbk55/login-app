import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { ListIcon } from "@/components/admin/icons";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/badge";
import {
  findPermissionCatalogHref,
  listPermissionGroups,
} from "@/lib/permission-groups";
import { BUTTON, BUTTON_SM, CODE_CHIP, ROW_CARD, TABLE } from "@/lib/styles";
import { deletePermissionGroupAction } from "./actions";

export default async function AdminPermissionGroupsPage() {
  const [groups, catalogHref] = await Promise.all([
    listPermissionGroups(),
    findPermissionCatalogHref(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhóm quyền"
        description="Gán nhóm cho người dùng ở trang chi tiết của họ. Xoá nhóm sẽ tự bỏ khỏi mọi người dùng."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Quyền chọn được ở form lấy từ danh mục này */}
            <Link
              href={catalogHref}
              className={`${BUTTON.secondary} w-full sm:w-auto`}
            >
              <ListIcon className="size-4" />
              Danh mục quyền
            </Link>
            <Link
              href="/admin/permission-groups/new"
              className={`${BUTTON.primary} w-full sm:w-auto`}
            >
              + Thêm nhóm
            </Link>
          </div>
        }
      />

      {/* Mobile: thẻ thay cho hàng bảng, khỏi phải cuộn ngang */}
      <ul className="grid gap-3 md:hidden">
        {groups.map((group) => (
          <li key={group.id} className={ROW_CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{group.name}</p>
                <code className={`${CODE_CHIP} mt-1 inline-block`}>
                  {group.slug}
                </code>
              </div>
              <Badge tone={group.memberCount > 0 ? "brand" : "neutral"}>
                {group.memberCount} thành viên
              </Badge>
            </div>

            {group.description && (
              <p className="text-xs text-admin-muted">{group.description}</p>
            )}

            <div className="border-t border-admin-border/60 pt-3">
              <p className="mb-1.5 text-xs text-admin-muted">
                Quyền ({group.permissions.length})
              </p>
              {group.permissions.length === 0 ? (
                <p className="text-xs text-admin-muted">không có quyền</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {group.permissions.map((permission) => (
                    <code key={permission} className={CODE_CHIP}>
                      {permission}
                    </code>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/permission-groups/${group.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                Sửa
              </Link>
              <DeleteButton
                id={group.id}
                action={deletePermissionGroupAction}
                confirmText={`Xoá nhóm "${group.name}"? ${group.memberCount} người dùng sẽ mất quyền từ nhóm này.`}
              />
            </div>
          </li>
        ))}
        {groups.length === 0 && (
          <li className={`${ROW_CARD} text-center text-sm text-admin-muted`}>
            Chưa có nhóm quyền nào.
          </li>
        )}
      </ul>

      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Nhóm</th>
              <th className={TABLE.th}>Quyền</th>
              <th className={TABLE.th}>Thành viên</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className={TABLE.tr}>
                <td className={TABLE.td}>
                  <span className="block font-medium">{group.name}</span>
                  <code className={`${CODE_CHIP} mt-1 inline-block`}>
                    {group.slug}
                  </code>
                  {group.description && (
                    <span className="mt-1 block text-xs text-admin-muted">
                      {group.description}
                    </span>
                  )}
                </td>
                <td className={TABLE.td}>
                  {group.permissions.length === 0 ? (
                    <span className="text-xs text-admin-muted">
                      không có quyền
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {group.permissions.map((permission) => (
                        <code key={permission} className={CODE_CHIP}>
                          {permission}
                        </code>
                      ))}
                    </div>
                  )}
                </td>
                <td className={TABLE.td}>
                  <Badge tone={group.memberCount > 0 ? "brand" : "neutral"}>
                    {group.memberCount}
                  </Badge>
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/permission-groups/${group.id}`}
                      className={`${BUTTON.secondary} ${BUTTON_SM}`}
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
