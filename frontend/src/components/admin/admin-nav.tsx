"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import {
  DashboardIcon,
  MailIcon,
  NewspaperIcon,
  ShieldIcon,
  TagIcon,
  UsersIcon,
} from "@/components/admin/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  exact?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan", icon: DashboardIcon, exact: true },
  { href: "/admin/users", label: "Người dùng", icon: UsersIcon },
  { href: "/admin/articles", label: "Bài viết", icon: NewspaperIcon },
  { href: "/admin/categories", label: "Danh mục", icon: TagIcon },
  { href: "/admin/contacts", label: "Liên hệ", icon: MailIcon },
  { href: "/admin/permission-groups", label: "Nhóm quyền", icon: ShieldIcon },
];

export function AdminNav({
  collapsed = false,
  onNavigate,
}: {
  /** Chỉ hiện icon, dùng cho sidebar thu gọn trên desktop. */
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1" aria-label="Điều hướng quản trị">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            // `title` thay cho nhãn khi thu gọn, để vẫn biết đó là mục gì.
            title={collapsed ? item.label : undefined}
            className={`group flex items-center rounded-lg py-2.5 text-sm transition ${
              collapsed ? "justify-center px-0" : "gap-3 px-3"
            } ${
              active
                ? "bg-white/15 font-semibold text-white shadow-sm"
                : "font-medium text-brand-100/75 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon
              className={`size-5 shrink-0 transition ${
                active
                  ? "text-white"
                  : "text-brand-200/70 group-hover:text-white"
              }`}
            />
            {!collapsed && (
              <>
                <span className="truncate">{item.label}</span>
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-brand-300" />
                )}
              </>
            )}
            {collapsed && <span className="sr-only">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
