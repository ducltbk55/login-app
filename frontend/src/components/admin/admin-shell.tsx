"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { AccountMenu, type AdminInfo } from "@/components/admin/account-menu";
import { AdminNav } from "@/components/admin/admin-nav";
import {
  CloseIcon,
  LockIcon,
  MenuIcon,
  PanelLeftIcon,
} from "@/components/admin/icons";
import { COMPANY_LOGO, COMPANY_NAME } from "@/lib/company";

/** Nhớ trạng thái thu gọn giữa các lần tải trang. */
const COLLAPSE_COOKIE = "admin_sidebar";

function SidebarContent({
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
  /** Chỉ có ở sidebar desktop; ngăn kéo mobile luôn ở dạng đầy đủ. */
  onToggleCollapse?: () => void;
}) {
  return (
    <div
      className={`flex h-full flex-col gap-4 overflow-x-hidden overflow-y-auto bg-brand-950 py-4 ${
        collapsed ? "px-3" : "px-4"
      }`}
    >
      {/* Đầu sidebar: logo + tên hệ thống bên trái, nút thu gọn bên phải.
          Khi thu gọn thì xếp dọc cho vừa bề ngang 76px. */}
      <div
        className={`flex items-center ${
          collapsed ? "flex-col gap-2" : "justify-between gap-2"
        }`}
      >
        <Link
          href="/admin"
          title={collapsed ? "System page" : undefined}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white ring-1 ring-white/25">
            <LockIcon className="size-5" />
          </span>
          {!collapsed && (
            <span className="min-w-0 truncate text-sm font-semibold tracking-wider text-white uppercase">
              System page
            </span>
          )}
        </Link>

        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-brand-100/75 transition hover:bg-white/10 hover:text-white"
          >
            <PanelLeftIcon
              className={`size-5 ${collapsed ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      <div className="flex-1">
        <AdminNav collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </div>
  );
}

/**
 * Khung của khu /admin: sidebar cố định từ `lg` (thu gọn được), ngăn kéo trượt
 * ở mobile và thanh tiêu đề dính trên cùng. Nhận `signOutSlot` từ layout
 * (server) vì nút đăng xuất là form gọi server action.
 */
export function AdminShell({
  admin,
  signOutSlot,
  initialCollapsed,
  children,
}: {
  admin: AdminInfo;
  signOutSlot: ReactNode;
  /** Đọc từ cookie ở layout nên không bị nhấp nháy khi tải trang. */
  initialCollapsed: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();

  // Lưu đường dẫn lúc mở thay vì một cờ boolean: đổi trang là ngăn kéo tự đóng,
  // không cần effect đồng bộ lại.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;
  const setOpen = (next: boolean) => setOpenedAt(next ? pathname : null);

  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${COLLAPSE_COOKIE}=${
      next ? "collapsed" : "expanded"
    }; path=/; max-age=31536000; samesite=lax`;
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-dvh flex-1 bg-admin-bg text-admin-text">
      {/* Sidebar cố định cho màn hình lớn */}
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden transition-[width] duration-200 lg:block ${
          collapsed ? "w-[4.75rem]" : "w-64"
        }`}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
        />
      </aside>

      {/* Ngăn kéo cho mobile/tablet — luôn ở dạng đầy đủ */}
      {open && (
        <div className="admin-drawer-open fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-brand-950/60 backdrop-blur-sm"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu quản trị"
            className="absolute inset-y-0 left-0 w-[17rem] max-w-[85vw] shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng menu"
              className="absolute top-4 right-3 z-10 grid size-9 cursor-pointer place-items-center rounded-lg text-brand-100 transition hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="size-5" />
            </button>
            <SidebarContent
              collapsed={false}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}

      <div
        className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${
          collapsed ? "lg:pl-[4.75rem]" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 border-b border-admin-border bg-admin-surface/85 backdrop-blur">
          {/* Bên trái chỉ còn nút mở menu ở mobile; tài khoản dồn sang phải */}
          <div className="flex min-h-16 w-full items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8 xl:px-10">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Mở menu"
              aria-expanded={open}
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-admin-border text-admin-muted transition hover:border-brand-300 hover:text-brand-700 lg:hidden"
            >
              <MenuIcon className="size-5" />
            </button>

            <Link
              href="/admin"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <Image
                src={COMPANY_LOGO}
                alt={`Logo ${COMPANY_NAME}`}
                width={192}
                height={192}
                priority
                className="size-10 shrink-0 rounded-full"
              />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-admin-text">
                  {COMPANY_NAME}
                </span>
                <span className="hidden truncate text-xs text-admin-muted sm:block">
                  Trang quản trị
                </span>
              </span>
            </Link>

            <AccountMenu admin={admin} signOutSlot={signOutSlot} />
          </div>
        </header>

        {/* Dùng hết bề ngang màn hình, chỉ chừa padding — không giới hạn max-width */}
        <main className="w-full flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
