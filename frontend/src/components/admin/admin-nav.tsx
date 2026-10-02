"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string; exact?: boolean };

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Tổng quan", exact: true },
  { href: "/admin/users", label: "Người dùng" },
  { href: "/admin/categories", label: "Danh mục" },
  { href: "/admin/permission-groups", label: "Nhóm quyền" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto sm:flex-col sm:overflow-visible">
      {ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm whitespace-nowrap transition ${
              active
                ? "bg-foreground font-medium text-background"
                : "opacity-70 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
