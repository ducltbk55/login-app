import Link from "next/link";

import { Badge } from "@/components/badge";
import { formatDateTime } from "@/lib/format";
import { BUTTON, INPUT, TABLE } from "@/lib/styles";
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Người dùng</h2>
          <p className="text-sm opacity-60">
            Tài khoản được tạo tự động khi đăng nhập Google, nên ở đây chỉ xem và
            phân quyền.
          </p>
        </div>
      </div>

      {/* GET form: bộ lọc nằm trên URL nên chia sẻ/bookmark được */}
      <form className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium opacity-70">Tìm kiếm</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Tên hoặc email (bỏ dấu cũng được)"
            className={`${INPUT} sm:w-72`}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium opacity-70">Vai trò</span>
          <select name="role" defaultValue={role ?? ""} className={INPUT}>
            <option value="">Tất cả</option>
            <option value="admin">admin</option>
            <option value="user">user</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium opacity-70">
            Trạng thái
          </span>
          <select name="status" defaultValue={status ?? ""} className={INPUT}>
            <option value="">Tất cả</option>
            <option value="active">active</option>
            <option value="blocked">blocked</option>
          </select>
        </label>
        <button type="submit" className={BUTTON.secondary}>
          Lọc
        </button>
        {(search || role || status) && (
          <Link href="/admin/users" className={BUTTON.secondary}>
            Xoá lọc
          </Link>
        )}
      </form>

      <p className="text-sm opacity-60">{users.length} bản ghi</p>

      <div className={TABLE.wrapper}>
        <table className={TABLE.table}>
          <thead>
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
              <tr key={user.id}>
                <td className={TABLE.td}>
                  <span className="block font-medium">
                    {user.name ?? "—"}
                  </span>
                  <span className="block text-xs opacity-60">
                    {user.email}
                  </span>
                </td>
                <td className={TABLE.td}>
                  <Badge tone={user.role === "admin" ? "info" : "neutral"}>
                    {user.role}
                  </Badge>
                </td>
                <td className={TABLE.td}>
                  <Badge
                    tone={user.status === "active" ? "success" : "danger"}
                  >
                    {user.status}
                  </Badge>
                </td>
                <td className={TABLE.td}>
                  {formatDateTime(user.lastLoginAt)}
                </td>
                <td className={`${TABLE.td} tabular-nums`}>
                  {user.loginCount}
                </td>
                <td className={TABLE.td}>
                  <Link
                    href={`/admin/users/${encodeURIComponent(user.email)}`}
                    className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
                  >
                    Chi tiết
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
