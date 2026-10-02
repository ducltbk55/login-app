import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import type { JWT } from "next-auth/jwt";

import { AUTH_MODE_COOKIE } from "@/lib/auth-mode";
import { BackendError } from "@/lib/backend";
import {
  DEV_LOGIN_ENABLED,
  DEV_LOGIN_PROVIDER,
  findUserById,
} from "@/lib/dev-login";
import {
  findUserByEmail,
  registerOrLogin,
  type StoredUser,
  type SyncMode,
} from "@/lib/users";

/** Người dùng vừa bấm Đăng nhập hay Đăng ký — mặc định là đăng nhập. */
async function readMode(): Promise<SyncMode> {
  const store = await cookies();
  return store.get(AUTH_MODE_COOKIE)?.value === "register"
    ? "register"
    : "login";
}

/** Nhét thông tin từ backend vào JWT. Dùng chung cho Google và dev login. */
function fillToken(token: JWT, stored: StoredUser, isNewUser: boolean): JWT {
  token.userId = stored.id;
  token.accountId = stored.accountId;
  token.provider = stored.provider;
  token.role = stored.role;
  token.createdAt = stored.createdAt;
  token.loginCount = stored.loginCount;
  token.isNewUser = isNewUser;
  return token;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      // Bắt buộc chọn tài khoản mỗi lần đăng nhập cho dễ thử nghiệm.
      authorization: { params: { prompt: "select_account" } },
    }),

    /**
     * Đăng nhập thẳng bằng id, chỉ có ở môi trường dev. Mảng rỗng ở production
     * nên provider không tồn tại — `signIn("dev-login")` sẽ không tìm thấy.
     */
    ...(DEV_LOGIN_ENABLED
      ? [
          Credentials({
            id: DEV_LOGIN_PROVIDER,
            name: "Dev login",
            credentials: { userId: { label: "User id" } },
            async authorize(credentials) {
              const id = Number(credentials?.userId);
              if (!Number.isInteger(id) || id <= 0) return null;

              const user = await findUserById(id);
              if (!user) return null;

              return {
                id: String(user.id),
                email: user.email,
                name: user.name,
                image: user.image,
              };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * Cổng duy nhất quyết định có được tạo phiên hay không.
     *
     * Trả về string thì Auth.js chuyển hướng tới đó và KHÔNG tạo phiên — nhờ
     * vậy đăng ký (chỉ tạo tài khoản ở trạng thái chờ duyệt) không vô tình
     * đăng nhập luôn cho người dùng.
     */
    async signIn({ user, account }) {
      if (!user.email || !account) return false;

      // Dev login đã xác thực xong ở `authorize`. Cố ý KHÔNG kiểm tra
      // đăng ký/duyệt ở đây để còn đóng vai được cả tài khoản đang chờ duyệt
      // hoặc bị khoá — đó chính là thứ cần thử.
      if (account.provider === DEV_LOGIN_PROVIDER) return DEV_LOGIN_ENABLED;

      const mode = await readMode();

      if (mode === "register") {
        try {
          await registerOrLogin({
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            mode: "register",
          });
          return "/register?registered=1";
        } catch (error) {
          if (error instanceof BackendError && error.status === 409) {
            return "/register?error=AlreadyRegistered";
          }
          return "/register?error=RegisterFailed";
        }
      }

      // Đăng nhập: tài khoản phải tồn tại và đã được duyệt.
      try {
        const existing = await findUserByEmail(user.email);
        if (!existing) return "/login?error=NotRegistered";
        if (existing.status === "inactive") return "/login?error=AccountPending";
        if (existing.status === "blocked") return "/login?error=AccountBlocked";
      } catch {
        // Backend lỗi/không chạy: để callback `jwt` bên dưới báo
        // CallbackRouteError với thông báo cụ thể, thay vì AccessDenied chung.
      }

      return true;
    },

    async jwt({ token, account, user }) {
      // Dev login không gọi `/users/sync`: không tăng loginCount, không ghi
      // login_events, nên dữ liệu thật không bị bẩn vì việc thử nghiệm.
      if (account?.provider === DEV_LOGIN_PROVIDER && user?.email) {
        const stored = await findUserByEmail(user.email);
        return stored ? fillToken(token, stored, false) : token;
      }

      // `account` chỉ có ở lần callback ngay sau khi đăng nhập Google thành công.
      if (account && user?.email) {
        const { user: stored, isNewUser } = await registerOrLogin({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account.provider,
          mode: "login",
        });

        fillToken(token, stored, isNewUser);
      }

      return token;
    },

    async session({ session, token }) {
      // next-auth quy ước `user.id` là chuỗi, còn khoá chính giờ là số.
      session.user.id =
        token.userId === undefined ? session.user.id : String(token.userId);
      session.user.accountId = token.accountId;
      session.user.provider = token.provider;
      session.user.role = token.role;
      session.user.createdAt = token.createdAt;
      session.user.loginCount = token.loginCount;
      session.user.isNewUser = token.isNewUser ?? false;
      return session;
    },
  },
});
