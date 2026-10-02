import type { DefaultSession } from "next-auth";

import type { UserRole } from "@/lib/users";

/**
 * Các trường lấy từ backend NestJS, nhét vào JWT rồi ánh xạ sang session.
 *
 * Lưu ý: đây là ảnh chụp lúc đăng nhập (JWT stateless). `role` ở đây chỉ dùng để
 * hiện/ẩn link, còn cổng vào /admin luôn kiểm tra lại DB — xem `lib/admin.ts`.
 */
interface BackendClaims {
  /** GUID tài khoản (cột `users.accountId`), ổn định qua các lần migrate. */
  accountId?: string;
  provider?: string;
  role?: UserRole;
  createdAt?: string;
  loginCount?: number;
  isNewUser?: boolean;
}

declare module "next-auth" {
  interface Session {
    user: { id: string } & BackendClaims & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT extends BackendClaims {
    /** Khoá chính số của bảng users. */
    userId?: number;
  }
}

// next-auth v5 tái xuất kiểu JWT từ @auth/core, cần augment cả module này.
declare module "@auth/core/jwt" {
  interface JWT extends BackendClaims {
    userId?: number;
  }
}
