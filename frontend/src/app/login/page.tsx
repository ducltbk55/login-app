import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { AuthShell } from "@/components/site/auth-shell";
import { COMPANY_NAME } from "@/lib/company";

export const metadata = {
  title: "Đăng nhập",
  description: `Đăng nhập tài khoản thành viên ${COMPANY_NAME}.`,
};

const ERROR_MESSAGES: Record<string, string> = {
  NotRegistered:
    "Email này chưa đăng ký. Hãy đăng ký trước rồi quay lại đăng nhập.",
  AccountPending:
    "Tài khoản đang chờ quản trị viên duyệt. Chúng tôi sẽ thông báo khi tài khoản được kích hoạt.",
  AccountBlocked:
    "Tài khoản của bạn đã bị khoá. Hãy liên hệ quản trị viên để được mở lại.",
  OAuthSignin: "Không khởi tạo được phiên đăng nhập với Google.",
  OAuthCallback: "Google trả về lỗi trong quá trình xác thực.",
  OAuthAccountNotLinked:
    "Email này đã được đăng ký bằng phương thức khác. Hãy dùng đúng phương thức ban đầu.",
  AccessDenied: "Bạn đã từ chối cấp quyền cho ứng dụng.",
  // Auth.js chỉ trả ra vài mã "an toàn với client"; mọi lỗi phía máy chủ còn
  // lại (kể cả CallbackRouteError khi gọi backend hỏng) đều gom về
  // "Configuration", nên thông báo phải chung chung — chi tiết nằm trong log
  // dev của Next (.next/dev/logs/next-development.log).
  Configuration:
    "Hệ thống đang gặp sự cố nên chưa đăng nhập được. Vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên.",
};

const HIGHLIGHTS = [
  "Theo dõi yêu cầu và dự án của bạn ở một nơi",
  "Xem lại lịch sử đăng nhập và thông tin tài khoản",
  "Cập nhật hồ sơ bất cứ lúc nào",
];

export default async function LoginPage(props: PageProps<"/login">) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error } = await props.searchParams;
  const errorKey = Array.isArray(error) ? error[0] : error;
  const errorMessage = errorKey
    ? (ERROR_MESSAGES[errorKey] ?? "Đăng nhập thất bại, vui lòng thử lại.")
    : null;
  // Chờ duyệt không phải lỗi của người dùng nên hiển thị dịu hơn.
  const pending = errorKey === "AccountPending";

  return (
    <AuthShell
      title="Đăng nhập"
      description="Dùng tài khoản Google đã đăng ký để tiếp tục."
      highlights={HIGHLIGHTS}
      footer={
        <p className="text-center text-sm text-black/55">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="font-semibold text-gold-700 underline underline-offset-4 transition hover:text-gold-600"
          >
            Đăng ký ngay
          </Link>
        </p>
      }
    >
      {errorMessage && (
        <p
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${
            pending
              ? "border-gold-400/50 bg-gold-50 text-gold-800"
              : "border-red-500/30 bg-red-50 text-red-700"
          }`}
        >
          {errorMessage}
        </p>
      )}

      <GoogleSignInButton label="Đăng nhập với Google" />

      <p className="text-center text-xs text-black/45">
        Chỉ tài khoản đã được quản trị viên duyệt mới đăng nhập được.
      </p>
    </AuthShell>
  );
}
