import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card } from "@/components/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Không khởi tạo được phiên đăng nhập với Google.",
  OAuthCallback: "Google trả về lỗi trong quá trình xác thực.",
  OAuthAccountNotLinked:
    "Email này đã được đăng ký bằng phương thức khác. Hãy dùng đúng phương thức ban đầu.",
  AccessDenied: "Bạn đã từ chối cấp quyền cho ứng dụng.",
  AccountBlocked:
    "Tài khoản của bạn đã bị khoá. Hãy liên hệ quản trị viên để được mở lại.",
  Configuration:
    "Cấu hình chưa đúng. Kiểm tra AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET trong .env.local.",
  CallbackRouteError:
    "Xác thực Google thành công nhưng không lưu được dữ liệu. Kiểm tra backend NestJS có đang chạy tại BACKEND_URL không.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error } = await props.searchParams;
  const errorKey = Array.isArray(error) ? error[0] : error;
  const errorMessage = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? "Đăng nhập thất bại, vui lòng thử lại.")
    : null;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-sm space-y-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Chào mừng trở lại
          </h1>
          <p className="text-sm opacity-70">
            Đăng nhập hoặc tạo tài khoản mới chỉ bằng một cú nhấp.
          </p>
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400"
          >
            {errorMessage}
          </p>
        )}

        <GoogleSignInButton />

        <p className="text-center text-xs opacity-60">
          Chưa có tài khoản? Cứ đăng nhập bằng Google — chúng tôi sẽ tự tạo tài
          khoản cho bạn.
        </p>

        <p className="text-center text-sm">
          <Link
            href="/"
            className="underline underline-offset-4 opacity-70 hover:opacity-100"
          >
            Về trang chủ
          </Link>
        </p>
      </Card>
    </main>
  );
}
