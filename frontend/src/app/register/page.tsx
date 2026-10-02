import Link from "next/link";
import { redirect } from "next/navigation";

import { registerWithGoogle } from "@/app/actions";
import { auth } from "@/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AuthShell } from "@/components/site/auth-shell";
import { COMPANY_NAME } from "@/lib/company";

export const metadata = {
  title: "Đăng ký",
  description: `Đăng ký tài khoản thành viên ${COMPANY_NAME}.`,
};

const ERROR_MESSAGES: Record<string, string> = {
  AlreadyRegistered:
    "Email này đã đăng ký rồi. Hãy đăng nhập thay vì đăng ký lại.",
  RegisterFailed:
    "Chưa tạo được tài khoản. Vui lòng thử lại, hoặc liên hệ chúng tôi nếu lỗi lặp lại.",
  // Auth.js gom mọi lỗi máy chủ không an toàn với client về mã này.
  Configuration:
    "Hệ thống đang gặp sự cố nên chưa đăng ký được. Vui lòng thử lại sau ít phút.",
};

const HIGHLIGHTS = [
  "Đăng ký bằng Google, không phải nhớ thêm mật khẩu",
  "Bổ sung hồ sơ một lần, dùng cho mọi yêu cầu sau này",
  "Nhận thông báo khi có vị trí tuyển dụng phù hợp",
];

export default async function RegisterPage(props: PageProps<"/register">) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const params = await props.searchParams;
  const pick = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const errorKey = pick(params.error);
  const errorMessage = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? "Đăng ký thất bại, vui lòng thử lại.")
    : null;
  const registered = pick(params.registered) === "1";

  return (
    <AuthShell
      title={registered ? "Đăng ký thành công" : "Đăng ký thành viên"}
      description={
        registered
          ? "Tài khoản của bạn đã được tạo và đang chờ duyệt."
          : "Chỉ cần tài khoản Google. Sau khi đăng ký, quản trị viên sẽ duyệt tài khoản của bạn."
      }
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-center text-sm text-black/55">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="font-semibold text-gold-700 underline underline-offset-4 transition hover:text-gold-600"
          >
            Đăng nhập
          </Link>
        </p>
      }
    >
      {registered ? (
        <div className="space-y-4">
          <div
            role="status"
            className="rounded-xl border border-gold-400/50 bg-gold-50 p-5"
          >
            <p className="font-semibold text-gold-800">Đang chờ duyệt</p>
            <p className="mt-1.5 text-sm text-black/60">
              Quản trị viên sẽ kiểm tra và kích hoạt tài khoản. Khi tài khoản
              được duyệt, bạn đăng nhập bình thường bằng chính tài khoản Google
              vừa dùng.
            </p>
          </div>
          <Link
            href="/login"
            className="flex w-full items-center justify-center rounded-lg bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Tới trang đăng nhập
          </Link>
        </div>
      ) : (
        <>
          {errorMessage && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <GoogleSignInButton
            label="Đăng ký với Google"
            action={registerWithGoogle}
          />

          {/* Nói trước hai bước kế tiếp để người dùng không bất ngờ */}
          <ol className="space-y-2 rounded-xl border border-black/10 bg-gold-50/60 p-4 text-sm text-black/60">
            <li>
              <strong className="text-ink-900">1.</strong> Tài khoản được tạo ở
              trạng thái chờ duyệt.
            </li>
            <li>
              <strong className="text-ink-900">2.</strong> Quản trị viên duyệt,
              bạn đăng nhập và hoàn tất hồ sơ.
            </li>
          </ol>

          <p className="text-center text-xs text-black/45">
            Bằng việc tiếp tục, bạn đồng ý cho ứng dụng đọc tên, email và ảnh
            đại diện từ tài khoản Google.
          </p>
        </>
      )}
    </AuthShell>
  );
}
