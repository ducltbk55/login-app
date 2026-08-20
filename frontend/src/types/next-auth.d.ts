import type { DefaultSession } from "next-auth";

/** Các trường lấy từ backend NestJS, nhét vào JWT rồi ánh xạ sang session. */
interface BackendClaims {
  provider?: string;
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
    userId?: string;
  }
}

// next-auth v5 tái xuất kiểu JWT từ @auth/core, cần augment cả module này.
declare module "@auth/core/jwt" {
  interface JWT extends BackendClaims {
    userId?: string;
  }
}
