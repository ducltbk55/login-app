import Link from "next/link";

import { ChevronRightIcon } from "@/components/admin/icons";
import {
  Field,
  FilterBar,
  PageHeader,
} from "@/components/admin/page-header";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { Badge } from "@/components/badge";
import { formatDateTime } from "@/lib/format";
import { BUTTON, INPUT, ROW_CARD, TABLE } from "@/lib/styles";
import { listUsers, type UserRole, type UserStatus } from "@/lib/users";

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage(
  props: PageProps<"/admin/users">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const role = pickOne(params.role) as UserRole | undefined;
  const status = pickOne(params.status) as UserStatus | undefined;

  const users = await listUsers({ search, role, status });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Người dùng"
        description="Tài khoản được tạo tự động khi đăng nhập Google, nên ở đây chỉ xem và phân quyền."
      />

      {/* GET form: bộ lọc nằm trên URL nên chia sẻ/bookmark được */}
      <FilterBar>
        <Field label="Tìm kiếm" className="sm:flex-1 sm:min-w-56">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Tên hoặc email (bỏ dấu cũng được)"
            className={INPUT}
          />
        </Field>
        <Field label="Vai trò" className="sm:w-40">
          <SearchableSelect
            name="role"
            defaultValue={role ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              { value: "admin", label: "admin" },
              { value: "user", label: "user" },
            ]}
          />
        </Field>
        <Field label="Trạng thái" className="sm:w-40">
          <SearchableSelect
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Chờ duyệt" },
              { value: "blocked", label: "Đã khoá" },
            ]}
          />
        </Field>
        <div className="flex gap-2">
          <button type="submit" className={`${BUTTON.primary} flex-1 sm:flex-none`}>
            Lọc
          </button>
          {(search || role || status) && (
            <Link
              href="/admin/users"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      <p className="text-sm text-admin-muted">
        <span className="font-semibold text-admin-text">{users.length}</span> bản
        ghi
      </p>

      {/* Mobile: mỗi người dùng là một thẻ bấm được, không phải cuộn ngang */}
      <ul className="grid gap-3 md:hidden">
        {users.map((user) => (
          <li key={user.id}>
            <Link href={`/admin/users/${encodeURIComponent(user.email)}`} className={`${ROW_CARD} block`}>
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-500/12 text-sm font-semibold text-brand-700 dark:text-brand-300">
                  {(user.name ?? user.email).charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{user.name ?? "—"}</p>
                  <p className="truncate text-xs text-admin-muted">
                    {user.email}
                  </p>
                </div>
                <ChevronRightIcon className="size-4 shrink-0 text-admin-muted" />
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge tone={user.role === "admin" ? "brand" : "neutral"}>
                  {user.role}
                </Badge>
                <UserStatusBadge status={user.status} />
              </div>

              <dl className="grid grid-cols-2 gap-2 border-t border-admin-border/60 pt-3 text-xs">
                <div>
                  <dt className="text-admin-muted">Lần cuối</dt>
                  <dd className="mt-0.5">{formatDateTime(user.lastLoginAt)}</dd>
                </div>
                <div>
                  <dt className="text-admin-muted">Số lần</dt>
                  <dd className="mt-0.5 tabular-nums">{user.loginCount}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
        {users.length === 0 && (
          <li className={`${ROW_CARD} text-center text-sm text-admin-muted`}>
            Không có người dùng nào khớp bộ lọc.
          </li>
        )}
      </ul>

      {/* Từ md trở lên mới đủ chỗ cho bảng */}
      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Người dùng</th>
              <th className={TABLE.th}>Vai trò</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}>Lần cuối</th>
              <th className={TABLE.th}>Số lần</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={TABLE.tr}>
                <td className={TABLE.td}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500/12 text-xs font-semibold text-brand-700 dark:text-brand-300">
                      {(user.name ?? user.email).charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {user.name ?? "—"}
                      </span>
                      <span className="block text-xs text-admin-muted">
                        {user.email}
                      </span>
                    </span>
                  </div>
                </td>
                <td className={TABLE.td}>
                  <Badge tone={user.role === "admin" ? "brand" : "neutral"}>
                    {user.role}
                  </Badge>
                </td>
                <td className={TABLE.td}>
                  <UserStatusBadge status={user.status} />
                </td>
                <td className={`${TABLE.td} text-admin-muted`}>
                  {formatDateTime(user.lastLoginAt)}
                </td>
                <td className={`${TABLE.td} tabular-nums`}>
                  {user.loginCount}
                </td>
                <td className={`${TABLE.td} text-right`}>
                  <Link
                    href={`/admin/users/${encodeURIComponent(user.email)}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
                  >
                    Chi tiết
                    <ChevronRightIcon className="size-4" />
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className={TABLE.empty}>
                  Không có người dùng nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
