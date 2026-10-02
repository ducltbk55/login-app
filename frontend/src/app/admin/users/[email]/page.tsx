import Link from "next/link";
import { notFound } from "next/navigation";

import {
  RoleStatusForm,
  UserGroupsForm,
} from "@/components/admin/user-admin-forms";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { formatDateTime } from "@/lib/format";
import { listPermissionGroups } from "@/lib/permission-groups";
import { CARD_SUBTLE } from "@/lib/styles";
import { findUserByEmail, getLoginHistory } from "@/lib/users";
import { setUserGroupsAction, updateUserAction } from "../actions";

export default async function AdminUserDetailPage(
  props: PageProps<"/admin/users/[email]">,
) {
  const { email: rawEmail } = await props.params;
  const email = decodeURIComponent(rawEmail);

  const [user, groups, history] = await Promise.all([
    findUserByEmail(email),
    listPermissionGroups(),
    getLoginHistory(email, 10),
  ]);

  if (!user) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
      >
        ← Danh sách người dùng
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        {user.image && <Avatar src={user.image} name={user.name} size={56} />}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{user.name ?? "Người dùng"}</h2>
          <p className="text-sm opacity-60">{user.email}</p>
          <div className="flex gap-2">
            <Badge tone={user.role === "admin" ? "info" : "neutral"}>
              {user.role}
            </Badge>
            <Badge tone={user.status === "active" ? "success" : "danger"}>
              {user.status}
            </Badge>
          </div>
        </div>
      </header>

      <section className={`${CARD_SUBTLE} grid gap-4 text-sm sm:grid-cols-2`}>
        <div>
          <p className="text-xs uppercase opacity-60">Mã người dùng</p>
          <p className="mt-1 font-mono text-xs break-all">{user.id}</p>
        </div>
        <div>
          <p className="text-xs uppercase opacity-60">Nhà cung cấp</p>
          <p className="mt-1">{user.provider}</p>
        </div>
        <div>
          <p className="text-xs uppercase opacity-60">Ngày đăng ký</p>
          <p className="mt-1">{formatDateTime(user.createdAt)}</p>
        </div>
        <div>
          <p className="text-xs uppercase opacity-60">Đăng nhập gần nhất</p>
          <p className="mt-1">
            {formatDateTime(user.lastLoginAt)} · {user.loginCount} lần
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`${CARD_SUBTLE} space-y-4`}>
          <h3 className="text-sm font-semibold">Vai trò &amp; trạng thái</h3>
          <RoleStatusForm user={user} action={updateUserAction} />
        </section>

        <section className={`${CARD_SUBTLE} space-y-4`}>
          <h3 className="text-sm font-semibold">Nhóm quyền</h3>
          <UserGroupsForm
            user={user}
            groups={groups}
            action={setUserGroupsAction}
          />
        </section>
      </div>

      <section className={`${CARD_SUBTLE} space-y-3`}>
        <h3 className="text-sm font-semibold">
          Quyền hiệu lực ({user.permissions.length})
        </h3>
        {user.role === "admin" && (
          <p className="text-xs opacity-60">
            Vai trò admin được coi là có toàn bộ quyền, không phụ thuộc nhóm.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {user.permissions.map((permission) => (
            <code
              key={permission}
              className="rounded-md bg-black/5 px-2 py-1 text-xs dark:bg-white/10"
            >
              {permission}
            </code>
          ))}
          {user.permissions.length === 0 && (
            <p className="text-sm opacity-60">Chưa có quyền nào.</p>
          )}
        </div>
      </section>

      <section className={`${CARD_SUBTLE} space-y-3`}>
        <h3 className="text-sm font-semibold">
          {history.length} lần đăng nhập gần nhất
        </h3>
        <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
          {history.map((event) => (
            <li key={event.id} className="flex justify-between gap-4 py-2">
              <span>{formatDateTime(event.occurredAt)}</span>
              <span className="opacity-60">{event.provider}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
