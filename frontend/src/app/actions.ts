"use server";

import { cookies } from "next/headers";

import { signIn, signOut } from "@/auth";
import { AUTH_MODE_COOKIE } from "@/lib/auth-mode";

/**
 * Google OAuth không mang theo tham số tuỳ ý qua vòng chuyển hướng, nên đánh
 * dấu ý định bằng một cookie ngắn hạn. Callback `signIn` trong `auth.ts` đọc
 * lại cookie này để biết người dùng vừa bấm Đăng nhập hay Đăng ký.
 */
async function markMode(mode: "login" | "register") {
  const store = await cookies();
  store.set(AUTH_MODE_COOKIE, mode, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

export async function signInWithGoogle() {
  await markMode("login");
  await signIn("google", { redirectTo: "/dashboard" });
}

export async function registerWithGoogle() {
  await markMode("register");
  // Đăng ký không tạo phiên; callback `signIn` sẽ chuyển hướng về /register.
  await signIn("google", { redirectTo: "/register" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
