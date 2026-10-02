import { notFound } from "next/navigation";

import { signIn } from "@/auth";
import { BackendError } from "@/lib/backend";
import {
  DEV_LOGIN_ENABLED,
  DEV_LOGIN_PROVIDER,
  findUserById,
  isLocalRequest,
} from "@/lib/dev-login";

/**
 * `GET /dev-login/<id>` — tạo phiên cho người dùng có id đó rồi chuyển hướng.
 * Dán thẳng vào thanh địa chỉ là xong, không cần qua Google.
 *
 * Thêm `?next=/admin` để chọn nơi đáp sau khi đăng nhập (mặc định `/`).
 *
 * Ngoài dev (hoặc request không đến từ localhost) route trả 404 như thể nó
 * không tồn tại — xem `lib/dev-login.ts`.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!DEV_LOGIN_ENABLED || !isLocalRequest(request)) notFound();

  const { id } = await context.params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return problem(`Id không hợp lệ: ${id}`);
  }

  // Tra trước khi gọi signIn: `authorize` trả null sẽ chuyển hướng sang trang
  // lỗi chung chung, còn ở đây báo thẳng được nguyên nhân.
  try {
    const user = await findUserById(userId);
    if (!user) return problem(`Không có người dùng id = ${userId}`);
  } catch (error) {
    // 403 = backend chưa bật DEV_LOGIN. Thông báo của nó đã đủ rõ.
    if (error instanceof BackendError) return problem(error.message);
    throw error;
  }

  const next = new URL(request.url).searchParams.get("next") ?? "/";
  // Chỉ cho đường dẫn nội bộ, tránh biến URL này thành open redirect.
  const redirectTo = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  // `signIn` ném NEXT_REDIRECT — Next bắt và đổi thành response 302 kèm cookie.
  await signIn(DEV_LOGIN_PROVIDER, { userId: String(userId), redirectTo });
}

/** Lỗi dạng văn bản, kèm link về màn hình chọn cho đỡ phải đoán id. */
function problem(message: string): Response {
  return new Response(`${message}\n\nChọn tài khoản tại /dev-login\n`, {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
