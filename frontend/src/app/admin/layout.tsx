import Link from "next/link";

import { AdminNav } from "@/components/admin/admin-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Quản trị" };

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  // Chặn ở layout nên mọi trang con /admin/* đều được bảo vệ, kể cả trang thêm sau.
  const admin = await requireAdmin();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/15">
        <div>
          <h1 className="text-lg font-semibold">Trang quản trị</h1>
          <p className="text-sm opacity-60">
            {admin.name ?? admin.email} · {admin.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
          >
            Về trang cá nhân
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-col gap-6 sm:flex-row">
        <aside className="sm:w-48 sm:shrink-0">
          <AdminNav />
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
