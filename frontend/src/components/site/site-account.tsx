import Link from "next/link";

import { LoginIcon, UserPlusIcon } from "@/components/admin/icons";
import { SiteAccountMenu } from "@/components/site/site-account-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { auth } from "@/auth";

/**
 * Khu tài khoản trên thanh điều hướng: chưa đăng nhập thì Đăng nhập | Đăng ký,
 * đã đăng nhập thì sổ dropdown. Là server component vì phải đọc session.
 *
 * `role` lấy từ JWT nên chỉ là ảnh chụp lúc đăng nhập — đủ để hiện/ẩn link vào
 * khu quản trị, còn `/admin` luôn kiểm tra lại DB (xem `lib/admin.ts`).
 */
export async function SiteAccount() {
  const session = await auth();

  if (session?.user?.email) {
    return (
      <SiteAccountMenu
        user={{
          name: session.user.name ?? null,
          email: session.user.email,
          image: session.user.image ?? null,
          isAdmin: session.user.role === "admin",
        }}
        signOutSlot={<SignOutButton />}
      />
    );
  }

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link
        href="/login"
        title="Đăng nhập"
        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white sm:px-3"
      >
        <LoginIcon className="size-4 shrink-0" />
        {/* Màn hình hẹp chỉ còn icon, nhường chỗ cho nút mở menu */}
        <span className="hidden sm:inline">Đăng nhập</span>
      </Link>

      <span aria-hidden className="h-5 w-px bg-white/15" />

      <Link
        href="/register"
        title="Đăng ký"
        className="inline-flex items-center gap-2 rounded-lg bg-gold-400 px-3 py-2 text-sm font-semibold text-ink-900 transition hover:bg-gold-300 sm:px-4"
      >
        <UserPlusIcon className="size-4 shrink-0" />
        <span className="hidden sm:inline">Đăng ký</span>
      </Link>
    </div>
  );
}
