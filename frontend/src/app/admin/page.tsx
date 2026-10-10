import Link from "next/link";

import {
  ChevronRightIcon,
  ClockIcon,
  DashboardIcon,
  IdCardIcon,
  LockIcon,
  ShieldIcon,
  TagIcon,
  UsersIcon,
} from "@/components/admin/icons";
import { buildAdminMenu, can, type Permission } from "@/lib/access";
import { requireAdminArea } from "@/lib/admin";
import { listCategories } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import { listFunctions, listPermissionGroups } from "@/lib/permission-groups";
import { getCandidateStats } from "@/lib/recruitment";
import { CARD } from "@/lib/styles";
import { getUserStats, listUsers } from "@/lib/users";

/** Màu nhấn của từng ô thống kê — vẫn trong tông xanh, trừ ô cảnh báo. */
const TONES = {
  brand: "bg-brand-500/12 text-brand-600 dark:text-brand-300",
  deep: "bg-brand-900/10 text-brand-800 dark:bg-brand-400/15 dark:text-brand-200",
  danger: "bg-red-500/12 text-red-600 dark:text-red-400",
  warning: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
} as const;

/** Thông báo khi bị chặn ở một mục: `?denied=ARTICLES.WRITE`. */
function deniedMessage(code: string | undefined): string | null {
  if (!code) return null;
  return `Bạn chưa có quyền ${code} để vào mục hoặc thực hiện thao tác vừa rồi. Hãy nhờ quản trị viên gán nhóm quyền phù hợp.`;
}

export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  const user = await requireAdminArea();
  const { denied } = await props.searchParams;
  const allowed = (permission: Permission) => can(user, permission);
  const canUsers = allowed("USERS.READ");

  // Chỉ đọc số liệu của mục người dùng được xem.
  const [stats, groups, categories, recentUsers, functions, candidates] =
    await Promise.all([
      canUsers ? getUserStats() : null,
      allowed("PERMISSION-GROUPS.READ") ? listPermissionGroups() : null,
      allowed("CATEGORIES.READ") ? listCategories() : null,
      canUsers ? listUsers() : null,
      listFunctions().catch(() => null),
      allowed("CANDIDATES.READ") ? getCandidateStats() : null,
    ]);
  const menu = buildAdminMenu(user, functions);
  const deniedText = deniedMessage(
    typeof denied === "string" ? denied : undefined,
  );

  const userTiles = stats
    ? [
        {
          label: "Người dùng",
          value: stats.total,
          href: "/admin/users",
          icon: UsersIcon,
          tone: TONES.brand,
        },
        {
          label: "Quản trị viên",
          value: stats.admins,
          href: "/admin/users?role=admin",
          icon: LockIcon,
          tone: TONES.deep,
        },
        {
          label: "Chờ duyệt",
          value: stats.pending,
          href: "/admin/users?status=inactive",
          icon: ClockIcon,
          // Có người chờ thì nhấn màu vàng cho dễ thấy, hết thì để trung tính.
          tone: stats.pending > 0 ? TONES.warning : TONES.brand,
        },
        {
          label: "Bị khoá",
          value: stats.blocked,
          href: "/admin/users?status=blocked",
          icon: ShieldIcon,
          tone: TONES.danger,
        },
      ]
    : [];

  const tiles = [
    ...userTiles,
    ...(categories
      ? [
          {
            label: "Danh mục",
            value: categories.total,
            href: "/admin/categories",
            icon: TagIcon,
            tone: TONES.brand,
          },
        ]
      : []),
    ...(candidates
      ? [
          {
            label: "Hồ sơ ứng viên mới",
            value: candidates.pending,
            href: "/admin/candidates?status=new",
            icon: IdCardIcon,
            // Còn hồ sơ chưa xem thì nhấn màu, như tài khoản chờ duyệt.
            tone: candidates.pending > 0 ? TONES.warning : TONES.brand,
          },
        ]
      : []),
    ...(groups
      ? [
          {
            label: "Nhóm quyền",
            value: groups.length,
            href: "/admin/permission-groups",
            icon: DashboardIcon,
            tone: TONES.deep,
          },
        ]
      : []),
  ];

  const latest = recentUsers?.slice(0, 5) ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      {deniedText && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          {deniedText}
        </p>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-brand-700 via-brand-600 to-brand-800 p-6 text-white shadow-admin sm:p-8">
        <div
          aria-hidden
          className="absolute -top-20 -right-16 size-56 rounded-full bg-white/10"
        />
        <div
          aria-hidden
          className="absolute -bottom-24 -left-10 size-56 rounded-full bg-white/5"
        />
        <div className="relative space-y-2">
          <p className="text-xs font-semibold tracking-wider text-brand-100 uppercase">
            Tổng quan
          </p>
          <h2 className="text-xl font-semibold sm:text-2xl">
            Toàn bộ hệ thống trong một màn hình
          </h2>
          <p className="max-w-xl text-sm text-brand-50/90">
            {tiles.length > 0
              ? "Chạm vào một ô bên dưới để tới đúng danh sách đã lọc sẵn."
              : "Chọn một chức năng bên dưới hoặc ở menu bên trái để bắt đầu."}
          </p>
        </div>
      </section>

      {tiles.length > 0 && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
          {tiles.map((tile) => {
            const Icon = tile.icon;

            return (
              <Link
                key={tile.label}
                href={tile.href}
                className={`${CARD} group p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg`}
              >
                <span
                  className={`grid size-9 place-items-center rounded-lg ${tile.tone}`}
                >
                  <Icon className="size-5" />
                </span>
                <p className="mt-3 text-2xl font-semibold tabular-nums">
                  {tile.value}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-admin-muted">
                  <span className="truncate">{tile.label}</span>
                  <ChevronRightIcon className="size-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                </p>
              </Link>
            );
          })}
        </section>
      )}

      <section className={CARD}>
        <div className="border-b border-admin-border px-4 py-3 sm:px-5">
          <h3 className="text-sm font-semibold">Chức năng của bạn</h3>
        </div>
        <ul className="grid gap-px bg-admin-border/60 sm:grid-cols-2 lg:grid-cols-3">
          {menu.map((item) => (
            <li key={item.code} className="bg-admin-surface">
              <Link
                href={item.href}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium transition hover:bg-brand-500/5 sm:px-5"
              >
                {item.label}
                <ChevronRightIcon className="size-4 shrink-0 text-admin-muted" />
              </Link>
            </li>
          ))}
          {menu.length === 0 && (
            <li className="bg-admin-surface px-4 py-8 text-center text-sm text-admin-muted sm:col-span-2 lg:col-span-3">
              Bạn chưa có quyền xem mục nào.
            </li>
          )}
        </ul>
      </section>

      {canUsers && (
        <section className={CARD}>
          <div className="flex items-center gap-2 border-b border-admin-border px-4 py-3 sm:px-5">
            <ClockIcon className="size-4 text-brand-600 dark:text-brand-300" />
            <h3 className="text-sm font-semibold">5 người dùng mới nhất</h3>
            <Link
              href="/admin/users"
              className="ml-auto text-sm font-medium text-brand-700 transition hover:underline dark:text-brand-300"
            >
              Xem tất cả
            </Link>
          </div>

          <ul className="divide-y divide-admin-border/60">
            {latest.map((user) => (
              <li key={user.id}>
                <Link
                  href={`/admin/users/${encodeURIComponent(user.email)}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-500/5 sm:px-5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-500/12 text-sm font-semibold text-brand-700 dark:text-brand-300">
                    {(user.name ?? user.email).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {user.name ?? user.email}
                    </span>
                    <span className="block truncate text-xs text-admin-muted">
                      {user.email}
                    </span>
                  </span>
                  <span className="hidden shrink-0 text-xs text-admin-muted sm:block">
                    {formatDateTime(user.createdAt)}
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-admin-muted" />
                </Link>
              </li>
            ))}
            {latest.length === 0 && (
              <li className="px-4 py-12 text-center text-sm text-admin-muted">
                Chưa có người dùng nào.
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
