import { notFound } from "next/navigation";

import { ClockIcon } from "@/components/admin/icons";
import { BackLink } from "@/components/admin/page-header";
import {
  RoleStatusForm,
  UserGroupsForm,
} from "@/components/admin/user-admin-forms";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { can, isSuperAdmin } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatDate, formatDateTime } from "@/lib/format";
import { listPermissionGroups } from "@/lib/permission-groups";
import { CARD, CARD_SUBTLE, CODE_CHIP } from "@/lib/styles";
import {
  findUserByEmail,
  getLoginHistory,
  listProvinces,
  listWards,
  GENDER_LABELS,
} from "@/lib/users";
import { setUserGroupsAction, updateUserAction } from "../actions";

export default async function AdminUserDetailPage(
  props: PageProps<"/admin/users/[email]">,
) {
  const { email: rawEmail } = await props.params;
  const email = decodeURIComponent(rawEmail);

  const [user, groups, history, actor] = await Promise.all([
    findUserByEmail(email),
    listPermissionGroups(),
    getLoginHistory(email, 10),
    currentUser(),
  ]);

  if (!user) notFound();

  // Layout chỉ đòi USERS.READ. Người có USERS.WRITE mà không phải admin thì
  // không được đụng tới tài khoản admin, không đổi vai trò, không tự gán nhóm
  // cho mình — giống hệt các kiểm tra trong ../actions.ts.
  const superAdmin = isSuperAdmin(actor!);
  const canEdit =
    can(actor!, "USERS.WRITE") && (superAdmin || user.role !== "admin");
  const canEditGroups =
    canEdit &&
    (superAdmin || user.email.toLowerCase() !== actor!.email.toLowerCase());

  // Mã tỉnh/phường lưu trong DB, đổi sang tên để hiển thị.
  const [provinces, wards] = await Promise.all([
    user.provinceCode ? listProvinces() : Promise.resolve([]),
    user.provinceCode ? listWards(user.provinceCode) : Promise.resolve([]),
  ]);
  const address = [
    user.addressLine,
    wards.find((w) => w.code === user.wardCode)?.name,
    provinces.find((p) => p.code === user.provinceCode)?.name,
  ]
    .filter(Boolean)
    .join(", ");

  const facts = [
    { label: "Mã người dùng", value: `#${user.id}`, mono: true },
    { label: "Mã tài khoản", value: user.accountId, mono: true },
    { label: "Nhà cung cấp", value: user.provider },
    { label: "Ngày đăng ký", value: formatDateTime(user.createdAt) },
    {
      label: "Đăng nhập gần nhất",
      value: `${formatDateTime(user.lastLoginAt)} · ${user.loginCount} lần`,
    },
  ];

  return (
    <div className="space-y-5">
      <BackLink href="/admin/users">Danh sách người dùng</BackLink>

      {/* Banner xanh: nhận diện người dùng ngay ở đầu trang */}
      <header
        className={`${CARD} overflow-hidden bg-linear-to-br from-brand-700 to-brand-900 p-5 text-white sm:p-6`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {user.image ? (
            <span className="shrink-0 overflow-hidden rounded-full ring-2 ring-white/30">
              <Avatar src={user.image} name={user.name} size={64} />
            </span>
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white/15 text-xl font-semibold ring-2 ring-white/30">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 space-y-2">
            <h2 className="truncate text-lg font-semibold sm:text-xl">
              {user.name ?? "Người dùng"}
            </h2>
            <p className="truncate text-sm text-brand-100">{user.email}</p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium ring-1 ring-white/25">
                {user.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                  user.status === "active"
                    ? "bg-emerald-400/20 text-emerald-100 ring-emerald-300/40"
                    : user.status === "inactive"
                      ? "bg-amber-400/20 text-amber-100 ring-amber-300/40"
                      : "bg-red-400/20 text-red-100 ring-red-300/40"
                }`}
              >
                {user.status === "active"
                  ? "Đang hoạt động"
                  : user.status === "inactive"
                    ? "Chờ duyệt"
                    : "Đã khoá"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <section
        className={`${CARD_SUBTLE} grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-5`}
      >
        {facts.map((fact) => (
          <div key={fact.label}>
            <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
              {fact.label}
            </p>
            <p
              className={`mt-1 break-all ${fact.mono ? "font-mono text-xs" : ""}`}
            >
              {fact.value}
            </p>
          </div>
        ))}
      </section>

      <section className={`${CARD_SUBTLE} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">Hồ sơ thành viên</h3>
          <Badge tone={user.profileCompleted ? "success" : "neutral"}>
            {user.profileCompleted ? "đã hoàn tất" : "chưa hoàn tất"}
          </Badge>
        </div>
        <div className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
              Số điện thoại
            </p>
            <p className="mt-1">{user.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
              Giới tính
            </p>
            <p className="mt-1">
              {user.gender ? GENDER_LABELS[user.gender] : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
              Ngày sinh
            </p>
            <p className="mt-1">
              {user.birthDate ? formatDate(user.birthDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
              Địa chỉ
            </p>
            <p className="mt-1 break-words">{address || "—"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {canEdit && (
          <section className={`${CARD_SUBTLE} space-y-4`}>
            <h3 className="text-sm font-semibold">Vai trò &amp; trạng thái</h3>
            <RoleStatusForm
              user={user}
              action={updateUserAction}
              canChangeRole={superAdmin}
            />
          </section>
        )}

        <section className={`${CARD_SUBTLE} space-y-4`}>
          <h3 className="text-sm font-semibold">Nhóm quyền</h3>
          {canEditGroups ? (
            <UserGroupsForm
              user={user}
              groups={groups}
              action={setUserGroupsAction}
            />
          ) : (
            // Không sửa được thì chỉ liệt kê nhóm đang gán.
            <div className="flex flex-wrap gap-2">
              {user.groups.map((group) => (
                <Badge key={group.id} tone="brand">
                  {group.name}
                </Badge>
              ))}
              {user.groups.length === 0 && (
                <p className="text-sm text-admin-muted">Chưa thuộc nhóm nào.</p>
              )}
            </div>
          )}
        </section>
      </div>

      <section className={`${CARD_SUBTLE} space-y-3`}>
        <h3 className="text-sm font-semibold">
          Quyền hiệu lực ({user.permissions.length})
        </h3>
        {user.role === "admin" && (
          <p className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-700 dark:text-brand-300">
            Vai trò admin được coi là có toàn bộ quyền, không phụ thuộc nhóm.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {user.permissions.map((permission) => (
            <code key={permission} className={CODE_CHIP}>
              {permission}
            </code>
          ))}
          {user.permissions.length === 0 && (
            <p className="text-sm text-admin-muted">Chưa có quyền nào.</p>
          )}
        </div>
      </section>

      <section className={CARD}>
        <div className="flex items-center gap-2 border-b border-admin-border px-4 py-3 sm:px-5">
          <ClockIcon className="size-4 text-brand-600 dark:text-brand-300" />
          <h3 className="text-sm font-semibold">
            {history.length} lần đăng nhập gần nhất
          </h3>
        </div>
        <ul className="divide-y divide-admin-border/60 text-sm">
          {history.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-4 px-4 py-2.5 sm:px-5"
            >
              <span>{formatDateTime(event.occurredAt)}</span>
              <Badge tone="brand">{event.provider}</Badge>
            </li>
          ))}
          {history.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-admin-muted">
              Chưa có lần đăng nhập nào được ghi nhận.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
