import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

import { findUserByEmail, registerOrLogin } from "@/lib/users";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      // Bắt buộc chọn tài khoản mỗi lần đăng nhập cho dễ thử nghiệm.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    /**
     * Chặn tài khoản đã bị khoá ngay trước khi tạo phiên. Trả về string thì
     * Auth.js redirect tới đó, nhờ vậy hiện được thông báo đúng thay vì lỗi chung.
     */
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        const existing = await findUserByEmail(user.email);
        if (existing?.status === "blocked") {
          return "/login?error=AccountBlocked";
        }
      } catch {
        // Backend lỗi/không chạy: để callback `jwt` bên dưới báo CallbackRouteError
        // với thông báo cụ thể, thay vì AccessDenied chung chung ở đây.
      }

      return true;
    },

    async jwt({ token, account, user }) {
      // `account` chỉ có ở lần callback ngay sau khi đăng nhập Google thành công.
      if (account && user?.email) {
        const { user: stored, isNewUser } = await registerOrLogin({
          email: user.email,
          name: user.name,
          image: user.image,
          provider: account.provider,
        });

        token.userId = stored.id;
        token.provider = stored.provider;
        token.role = stored.role;
        token.createdAt = stored.createdAt;
        token.loginCount = stored.loginCount;
        token.isNewUser = isNewUser;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId ?? session.user.id;
      session.user.provider = token.provider;
      session.user.role = token.role;
      session.user.createdAt = token.createdAt;
      session.user.loginCount = token.loginCount;
      session.user.isNewUser = token.isNewUser ?? false;
      return session;
    },
  },
});
