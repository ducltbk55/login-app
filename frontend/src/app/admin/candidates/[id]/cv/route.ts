import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import { candidateCv } from "@/lib/recruitment";

/**
 * Chuyển tiếp CV từ backend về trình duyệt người tuyển dụng.
 *
 * CV là dữ liệu cá nhân nên không có đường dẫn công khai: mỗi lần tải đều qua
 * `requirePermission`, khoá nội bộ của backend không lộ ra trình duyệt, và
 * luồng được chuyển tiếp nguyên vẹn thay vì nạp cả tệp vào bộ nhớ.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  await requirePermission("CANDIDATES.READ");

  const { id } = await context.params;

  let upstream: Response;
  try {
    upstream = await candidateCv(id);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  // Giữ nguyên các header quyết định cách trình duyệt xử lý tệp — backend đặt
  // chúng theo kiểu tệp đã kiểm tra lúc nhận (recruitment/cv.ts).
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
