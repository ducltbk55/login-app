"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import type { AdminMenuItem, AdminSectionCode } from "@/lib/access";

import {
  BoxIcon,
  BriefcaseIcon,
  DashboardIcon,
  IdCardIcon,
  MailIcon,
  NewspaperIcon,
  ReceiptIcon,
  ShieldIcon,
  TagIcon,
  UsersIcon,
} from "@/components/admin/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

type NavItem = {
  href: string;
  label: string;
  icon: Icon;
  exact?: boolean;
};

/** Icon của từng chức năng; tên và thứ tự mục lấy từ danh mục chức năng. */
const ICONS: Record<AdminSectionCode, Icon> = {
  USERS: UsersIcon,
  ARTICLES: NewspaperIcon,
  PRODUCTS: BoxIcon,
  ORDERS: ReceiptIcon,
  CATEGORIES: TagIcon,
  CONTACTS: MailIcon,
  RECRUITMENT: BriefcaseIcon,
  CANDIDATES: IdCardIcon,
  "PERMISSION-GROUPS": ShieldIcon,
};

const OVERVIEW: NavItem = {
  href: "/admin",
  label: "Tổng quan",
  icon: DashboardIcon,
  exact: true,
};

export function AdminNav({
  items: menu,
  collapsed = false,
  onNavigate,
}: {
  /** Mục theo chức năng người dùng có quyền xem, đã sắp thứ tự. */
  items: AdminMenuItem[];
  /** Chỉ hiện icon, dùng cho sidebar thu gọn trên desktop. */
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items: NavItem[] = [
    OVERVIEW,
    ...menu.map((item) => ({
      href: item.href,
      label: item.label,
      icon: ICONS[item.code],
    })),
  ];

  return (
    <nav className="flex flex-col gap-1" aria-label="Điều hướng quản trị">
      {items.map((item) => {
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
