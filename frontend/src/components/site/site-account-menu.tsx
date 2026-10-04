"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  AlertIcon,
  ChevronDownIcon,
  DashboardIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
} from "@/components/admin/icons";
import { Avatar } from "@/components/avatar";

export type SiteAccountUser = {
  name: string | null;
  email: string;
  image: string | null;
  /** Được vào khu quản trị (admin hoặc có nhóm quyền). */
  canEnterAdmin: boolean;
};

const MENU_ITEM =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left " +
  "text-sm font-medium text-ink-900 transition hover:bg-gold-50 " +
  "focus:outline-none focus-visible:bg-gold-50";

const MENU_ICON = "size-4 shrink-0 text-gold-600";

function AccountAvatar({
  user,
  size,
}: {
  user: SiteAccountUser;
  size: number;
}) {
  if (user.image) {
    return (
      <span className="shrink-0 overflow-hidden rounded-full ring-1 ring-white/20">
        <Avatar src={user.image} name={user.name} size={size} />
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="grid shrink-0 place-items-center rounded-full bg-gold-400 font-semibold text-ink-900"
    >
      {(user.name ?? user.email).charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Hộp thoại xác nhận đăng xuất.
 *
 * Render qua portal ra `body`: thanh header có `backdrop-blur`, mà
 * `backdrop-filter` biến phần tử thành containing block cho con `position:
 * fixed` — để nguyên trong header thì `inset-0` ăn theo khung header cao 64px
 * nên hộp thoại bị dồn lên sát mép trên màn hình.
 *
 * Màu cố định (trắng / đen / vàng) chứ không dùng token của khu quản trị: token
 * đó đảo theo `prefers-color-scheme`, mà trang giới thiệu luôn nền sáng — dùng
 * chung sẽ ra hộp thoại tối nằm giữa trang sáng.
 */
function SignOutDialog({
  signOutSlot,
  onClose,
}: {
  signOutSlot: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-signout-title"
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
    >
      <button
        type="button"
        aria-label="Đóng hộp thoại"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-sm rounded-2xl border border-black/10 bg-white p-5 text-ink-900 shadow-2xl">
        <div className="flex gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
            <AlertIcon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <h2 id="site-signout-title" className="text-base font-semibold">
              Đăng xuất khỏi tài khoản?
            </h2>
            <p className="text-sm text-black/55">
              Bạn sẽ cần đăng nhập lại bằng Google để tiếp tục.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 sm:w-auto"
          >
            Huỷ
          </button>
          <div className="w-full sm:w-auto">{signOutSlot}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Nút tài khoản trên thanh điều hướng của trang giới thiệu.
 *
 * `signOutSlot` là form gọi server action, do layout (server) truyền xuống —
 * component này là client nên không tự dựng được.
 */
export function SiteAccountMenu({
  user,
  signOutSlot,
}: {
  user: SiteAccountUser;
  signOutSlot: ReactNode;
}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  // Mốc là đường dẫn lúc mở: đổi trang thì dropdown tự đóng, không cần effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  // Hộp thoại nằm ngoài dropdown, nếu không nó bị gỡ cùng lúc dropdown đóng.
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpenedAt(null);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedAt(null);
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpenedAt(open ? null : pathname)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex cursor-pointer items-center gap-2 rounded-full border p-1 transition sm:pr-3 ${
          open
            ? "border-gold-400/60 bg-white/10"
            : "border-transparent hover:border-white/20 hover:bg-white/10"
        }`}
      >
        <AccountAvatar user={user} size={32} />
        <span className="hidden max-w-32 truncate text-sm font-medium text-white sm:block">
          {user.name ?? "Tài khoản"}
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-white/60 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tài khoản"
          className="absolute right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl"
        >
          <div className="flex items-center gap-3 bg-ink-900 p-4 text-white">
            <AccountAvatar user={user} size={40} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {user.name ?? "Thành viên"}
              </span>
              <span className="block truncate text-xs text-gold-300">
                {user.email}
              </span>
            </span>
          </div>

          <div className="space-y-0.5 p-2">
            <Link href="/dashboard" className={MENU_ITEM}>
              <UserIcon className={MENU_ICON} />
              Trang cá nhân
            </Link>
            <Link href="/ho-so" className={MENU_ITEM}>
              <SettingsIcon className={MENU_ICON} />
              Chỉnh sửa hồ sơ
            </Link>
            {/* Chỉ hiện với người có quyền quản trị; /admin vẫn tự kiểm tra lại. */}
            {user.canEnterAdmin && (
              <Link href="/admin" className={MENU_ITEM}>
                <DashboardIcon className={MENU_ICON} />
                Trang quản trị
              </Link>
            )}
          </div>

          <div className="border-t border-black/10 p-2">
            <button
              type="button"
              onClick={() => {
                setOpenedAt(null);
                setConfirmingSignOut(true);
              }}
              className={`${MENU_ITEM} text-red-600 hover:bg-red-50`}
            >
              <LogoutIcon className="size-4 shrink-0" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      {confirmingSignOut && (
        <SignOutDialog
          signOutSlot={signOutSlot}
          onClose={() => setConfirmingSignOut(false)}
        />
      )}
    </div>
  );
}
