import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import { contactAttachment } from "@/lib/contacts";

/**
 * Chuyển tiếp tệp đính kèm từ backend về trình duyệt của admin.
 *
 * Tệp KHÔNG nằm trong thư mục tĩnh: nội dung khách gửi có thể là hồ sơ, hợp
 * đồng, ảnh chụp màn hình có dữ liệu riêng. Đi qua route này thì mỗi lần tải
 * đều phải qua `requirePermission`, và khoá nội bộ của backend không bao giờ lộ ra
 * phía trình duyệt.
 *
 * Luồng được chuyển tiếp nguyên vẹn, không nạp cả tệp vào bộ nhớ.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requirePermission("CONTACTS.READ");

  const { id } = await context.params;

  let upstream: Response;
  try {
    upstream = await contactAttachment(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  // Giữ nguyên các header quyết định cách trình duyệt xử lý tệp. Chúng do
  // backend đặt dựa trên kiểu tệp đã chốt từ lúc nhận (xem attachments.ts).
  const headers = new Headers();
  for (const key of [
    "content-type",
    "content-length",
    "content-disposition",
    "x-content-type-options",
  ]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("cache-control", "private, no-store");

  return new Response(upstream.body, { status: 200, headers });
}
