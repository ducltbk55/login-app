import Link from "next/link";

import { auth } from "@/auth";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { SignOutButton } from "@/components/sign-out-button";

export default async function Home() {
  const session = await auth();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="space-y-4">
        <span className="inline-block rounded-full border border-black/10 px-3 py-1 text-xs font-medium tracking-wide uppercase opacity-70 dark:border-white/20">
          Next.js · Auth.js · Google OAuth
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Đăng ký &amp; đăng nhập bằng Google
        </h1>
        <p className="mx-auto max-w-xl text-base opacity-70">
          Lần đầu đăng nhập, tài khoản của bạn sẽ được tạo tự động. Những lần sau
          hệ thống nhận diện và ghi nhận lượt đăng nhập của bạn.
        </p>
      </div>

      {session?.user ? (
        <Card className="flex w-full max-w-sm flex-col items-center gap-5">
          {session.user.image && (
            <Avatar src={session.user.image} name={session.user.name} />
          )}
          <div>
            <p className="font-medium">
              Xin chào, {session.user.name ?? "bạn"}!
            </p>
            <p className="text-sm opacity-70">{session.user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Vào trang cá nhân
            </Link>
            <SignOutButton />
          </div>
        </Card>
      ) : (
        <div className="w-full max-w-sm space-y-3">
          <GoogleSignInButton label="Đăng nhập / Đăng ký với Google" />
          <p className="text-xs opacity-60">
            Bằng việc tiếp tục, bạn đồng ý cho ứng dụng đọc tên, email và ảnh đại
            diện từ tài khoản Google.
          </p>
        </div>
      )}
    </main>
  );
}
