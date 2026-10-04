"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Dialog } from "@/components/admin/dialog";
import {
  AlertIcon,
  ChevronDownIcon,
  ExternalIcon,
  LogoutIcon,
  SettingsIcon,
  ShieldIcon,
  UserIcon,
} from "@/components/admin/icons";
import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/badge";
import { formatDateTime } from "@/lib/format";
import { BUTTON, CODE_CHIP } from "@/lib/styles";

/**
 * Hình dạng khai báo tại chỗ (không import type từ `lib/users`) để client
 * bundle không có đường nào chạm vào tầng gọi backend.
 */
export type AdminInfo = {
  id: number;
  accountId: string;
  name: string | null;
  email: string;
  image: string | null;
  provider: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  groups: { id: number; name: string; slug: string }[];
  permissions: string[];
};

/** Mục trong dropdown — tất cả đều là `button` vì chúng mở hộp thoại. */
const MENU_ITEM =
  "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left " +
  "text-sm font-medium text-admin-text transition hover:bg-brand-500/10 " +
  "focus:outline-none focus-visible:bg-brand-500/10";

const MENU_ICON = "size-4 shrink-0 text-brand-600 dark:text-brand-300";

/** Ảnh Google nếu có, không thì vòng tròn chữ cái đầu. */
function AccountAvatar({ admin, size }: { admin: AdminInfo; size: number }) {
  if (admin.image) {
    return (
      <span className="shrink-0 overflow-hidden rounded-full ring-1 ring-admin-border">
        <Avatar src={admin.image} name={admin.name} size={size} />
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="grid shrink-0 place-items-center rounded-full bg-brand-600 font-semibold text-white"
    >
      {(admin.name ?? admin.email).charAt(0).toUpperCase()}
    </span>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-admin-muted uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm break-all">{children}</p>
    </div>
  );
}

/** Hộp thoại xem thông tin tài khoản (chỉ đọc). */
function ProfileDialog({
  admin,
  onClose,
}: {
  admin: AdminInfo;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Thông tin tài khoản"
      icon={<UserIcon className={MENU_ICON} />}
      onClose={onClose}
      footer={
        <button type="button" onClick={onClose} className={BUTTON.secondary}>
          Đóng
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <AccountAvatar admin={admin} size={56} />
          <div className="min-w-0 space-y-1.5">
            <p className="truncate font-semibold">
              {admin.name ?? "Quản trị viên"}
            </p>
            <p className="truncate text-sm text-admin-muted">{admin.email}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{admin.role}</Badge>
              <Badge tone={admin.status === "active" ? "success" : "danger"}>
                {admin.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-4 border-t border-admin-border pt-4 sm:grid-cols-2">
          <Fact label="Mã người dùng">
            <span className="font-mono text-xs tabular-nums">#{admin.id}</span>
          </Fact>
          <Fact label="Mã tài khoản">
            <span className="font-mono text-xs">{admin.accountId}</span>
          </Fact>
          <Fact label="Nhà cung cấp">{admin.provider}</Fact>
          <Fact label="Ngày đăng ký">{formatDateTime(admin.createdAt)}</Fact>
          <Fact label="Đăng nhập gần nhất">
            {formatDateTime(admin.lastLoginAt)} · {admin.loginCount} lần
          </Fact>
        </div>
      </div>
    </Dialog>
  );
}

/** Hộp thoại quản lý: nhóm quyền, quyền hiệu lực và nơi chỉnh sửa. */
function ManageDialog({
  admin,
  onClose,
}: {
  admin: AdminInfo;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Quản lý thông tin cá nhân"
      icon={<SettingsIcon className={MENU_ICON} />}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BUTTON.secondary}>
            Đóng
          </button>
          <Link
            href={`/admin/users/${encodeURIComponent(admin.email)}`}
            onClick={onClose}
            className={BUTTON.primary}
          >
            Mở trang chi tiết
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <p className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-700 dark:text-brand-300">
          Tên và ảnh đại diện được đồng bộ từ tài khoản Google nên không sửa
          được tại đây. Vai trò và nhóm quyền chỉnh ở trang chi tiết người dùng.
        </p>

        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldIcon className={MENU_ICON} />
            Nhóm quyền ({admin.groups.length})
          </h3>
          {admin.groups.length === 0 ? (
            <p className="text-sm text-admin-muted">
              Chưa thuộc nhóm quyền nào.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {admin.groups.map((group) => (
                <li
                  key={group.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-admin-border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-medium">
                    {group.name}
                  </span>
                  <code className={CODE_CHIP}>{group.slug}</code>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2 border-t border-admin-border pt-4">
          <h3 className="text-sm font-semibold">
            Quyền hiệu lực ({admin.permissions.length})
          </h3>
          {admin.role === "admin" && (
            <p className="text-xs text-admin-muted">
              Vai trò admin được coi là có toàn bộ quyền, không phụ thuộc nhóm.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {admin.permissions.map((permission) => (
              <code key={permission} className={CODE_CHIP}>
                {permission}
              </code>
            ))}
            {admin.permissions.length === 0 && (
              <p className="text-sm text-admin-muted">Chưa có quyền nào.</p>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/** Hộp thoại xác nhận đăng xuất. */
function SignOutDialog({
  signOutSlot,
  onClose,
}: {
  /** Form gọi server action, do layout (server component) truyền xuống. */
  signOutSlot: ReactNode;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Đăng xuất khỏi hệ thống?"
      size="sm"
      icon={
        <AlertIcon className="size-4 shrink-0 text-red-600 dark:text-red-400" />
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={BUTTON.secondary}>
            Huỷ
          </button>
          <div className="w-full sm:w-auto">{signOutSlot}</div>
        </>
      }
    >
      <p className="text-sm text-admin-muted">
        Phiên làm việc hiện tại sẽ kết thúc. Bạn cần đăng nhập lại bằng Google
        để vào trang quản trị.
      </p>
    </Dialog>
  );
}

type DialogName = "profile" | "manage" | "signout";

/**
 * Nút tài khoản ở thanh header: bấm mở dropdown, mỗi mục mở một hộp thoại chứ
 * không chuyển trang.
 */
export function AccountMenu({
  admin,
  signOutSlot,
}: {
  admin: AdminInfo;
  signOutSlot: ReactNode;
}) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  // Mốc là đường dẫn lúc mở: đổi trang thì dropdown tự đóng, không cần effect.
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const open = openedAt === pathname;

  // Hộp thoại nằm ngoài dropdown, nếu không nó sẽ bị gỡ cùng lúc dropdown đóng.
  const [dialog, setDialog] = useState<DialogName | null>(null);
  const closeDialog = () => setDialog(null);

  /** Mọi mục đều đóng dropdown rồi mở hộp thoại tương ứng. */
  const openDialog = (name: DialogName) => {
    setOpenedAt(null);
    setDialog(name);
  };

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
        className={`flex cursor-pointer items-center gap-2 rounded-full border p-1 pr-2 transition sm:gap-3 sm:pr-3 ${
          open
            ? "border-brand-300 bg-brand-500/10"
            : "border-transparent hover:border-admin-border hover:bg-admin-surface-2"
        }`}
      >
        <AccountAvatar admin={admin} size={36} />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-40 truncate text-sm font-medium">
            {admin.name ?? "Quản trị viên"}
          </span>
          <span className="block max-w-40 truncate text-xs text-admin-muted">
            {admin.email}
          </span>
        </span>
        <ChevronDownIcon
          className={`size-4 shrink-0 text-admin-muted transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tài khoản"
          className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-admin-border bg-admin-surface shadow-2xl"
        >
          <div className="flex items-center gap-3 bg-linear-to-br from-brand-600 to-brand-800 p-4 text-white">
            <AccountAvatar admin={admin} size={44} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {admin.name ?? "Quản trị viên"}
              </span>
              <span className="block truncate text-xs text-brand-100">
                {admin.email}
              </span>
            </span>
          </div>

          <div className="space-y-0.5 p-2">
            <button
              type="button"
              onClick={() => openDialog("profile")}
              className={MENU_ITEM}
            >
              <UserIcon className={MENU_ICON} />
              Xem thông tin tài khoản
            </button>
            <button
              type="button"
              onClick={() => openDialog("manage")}
              className={MENU_ITEM}
            >
              <SettingsIcon className={MENU_ICON} />
              Quản lý thông tin cá nhân
            </button>
          </div>

          {/* Tách nhóm: mục này điều hướng thật, khác hai mục mở hộp thoại ở trên */}
          <div className="border-t border-admin-border p-2">
            <Link href="/" className={MENU_ITEM}>
              <ExternalIcon className={MENU_ICON} />
              Về trang chủ
            </Link>
          </div>

          <div className="border-t border-admin-border p-2">
            <button
              type="button"
              onClick={() => openDialog("signout")}
              className={`${MENU_ITEM} text-red-600 hover:bg-red-500/10 dark:text-red-400`}
            >
              <LogoutIcon className="size-4 shrink-0" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}

      {dialog === "profile" && (
        <ProfileDialog admin={admin} onClose={closeDialog} />
      )}
      {dialog === "manage" && (
        <ManageDialog admin={admin} onClose={closeDialog} />
      )}
      {dialog === "signout" && (
        <SignOutDialog signOutSlot={signOutSlot} onClose={closeDialog} />
      )}
    </div>
  );
}
