import Link from "next/link";

import { formatDateTime } from "@/lib/format";
import { listCategories } from "@/lib/categories";
import { listPermissionGroups } from "@/lib/permission-groups";
import { CARD_SUBTLE } from "@/lib/styles";
import { getUserStats, listUsers } from "@/lib/users";

export default async function AdminOverviewPage() {
  const [stats, groups, categories, recentUsers] = await Promise.all([
    getUserStats(),
    listPermissionGroups(),
    listCategories(),
    listUsers(),
  ]);

  const tiles = [
    { label: "Người dùng", value: stats.total, href: "/admin/users" },
    { label: "Quản trị viên", value: stats.admins, href: "/admin/users?role=admin" },
    {
      label: "Bị khoá",
      value: stats.blocked,
      href: "/admin/users?status=blocked",
    },
    {
      label: "Danh mục",
      value: categories.length,
      href: "/admin/categories",
    },
    {
      label: "Nhóm quyền",
      value: groups.length,
      href: "/admin/permission-groups",
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={`${CARD_SUBTLE} transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]`}
          >
            <p className="text-xs uppercase opacity-60">{tile.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {tile.value}
            </p>
          </Link>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium opacity-70">
          5 người dùng mới nhất
        </h2>
        <ul className="divide-y divide-black/5 rounded-xl border border-black/10 text-sm dark:divide-white/10 dark:border-white/15">
          {recentUsers.slice(0, 5).map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <Link
                href={`/admin/users/${encodeURIComponent(user.email)}`}
                className="underline underline-offset-4 decoration-transparent transition hover:decoration-current"
              >
                {user.name ?? user.email}
              </Link>
              <span className="opacity-60">
                {formatDateTime(user.createdAt)}
              </span>
            </li>
          ))}
          {recentUsers.length === 0 && (
            <li className="px-4 py-10 text-center opacity-60">
              Chưa có người dùng nào.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
