"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { CloseIcon, MenuIcon } from "@/components/admin/icons";
import {
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_SHORT_NAME,
} from "@/lib/company";
import { NAV_ITEMS } from "@/lib/site-nav";

/**
 * Thanh điều hướng của trang giới thiệu.
 *
 * Client component vì cần menu trượt ở mobile. `accountSlot` là nút đăng
 * nhập / tên người dùng, do layout (server) dựng sẵn rồi truyền vào — tầng
 * này không được phép đọc session.
 */
export function SiteHeader({ accountSlot }: { accountSlot: ReactNode }) {
  const pathname = usePathname();

  // Mốc là đường dẫn lúc mở: đổi trang thì menu tự đóng, không cần effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-900/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <Image
            src={COMPANY_LOGO}
            alt={`Logo ${COMPANY_NAME}`}
            width={192}
            height={192}
            priority
            className="size-10 shrink-0 rounded-full"
          />
          <span className="min-w-0 truncate text-base font-semibold tracking-wide text-white">
            {COMPANY_SHORT_NAME}
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href, item.exact) ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href, item.exact)
                  ? "text-gold-300"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-4">
          {accountSlot}

          <button
            type="button"
            onClick={() => setOpenedAt(open ? null : pathname)}
            aria-label={open ? "Đóng menu" : "Mở menu"}
            aria-expanded={open}
            className="grid size-10 cursor-pointer place-items-center rounded-lg border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            {open ? (
              <CloseIcon className="size-5" />
            ) : (
              <MenuIcon className="size-5" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-ink-900 lg:hidden">
          <nav className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  isActive(item.href, item.exact) ? "page" : undefined
                }
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive(item.href, item.exact)
                    ? "bg-white/10 text-gold-300"
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
