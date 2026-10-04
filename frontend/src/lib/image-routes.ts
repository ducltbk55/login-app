import { notFound } from "next/navigation";

import { currentAdmin } from "./admin";
import { BackendError } from "./backend";

/**
 * Thân chung của các route ảnh (bài viết, sản phẩm). Chỉ chạy phía server.
 *
 * Trình duyệt không bao giờ gọi thẳng backend (khoá nội bộ nằm ở server Next),
 * nên ảnh đi: editor/ô chọn ảnh → route admin (kiểm tra quyền) → backend lưu
 * file; và khi xem: trình duyệt → route /media công khai → backend đọc file.
 */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Lỗi theo đúng dạng SimpleUploadAdapter của CKEditor đọc được, để thông báo
 * hiện ra trong editor thay vì một câu "Không thể tải tệp" chung chung.
 */
function fail(message: string, status: number) {
  return Response.json({ error: { message } }, { status });
}

/** Nhận ảnh admin tải lên, trả `{ url }` — dạng CKEditor và CoverImageField cần. */
export async function handleImageUpload(
  request: Request,
  upload: (image: File) => Promise<string>,
  urlOf: (file: string) => string,
): Promise<Response> {
  // Route xác thực bằng cookie nên phải tự chặn request đến từ trang khác.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host || new URL(origin).host !== host) {
    return fail("Yêu cầu không hợp lệ.", 403);
  }

  if (!(await currentAdmin())) {
    return fail("Phiên đăng nhập đã hết hoặc bạn không có quyền quản trị.", 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail("Dữ liệu tải lên không hợp lệ.", 400);
  }

  const image = formData.get("upload");
  if (!(image instanceof File) || image.size === 0) {
    return fail("Chưa chọn ảnh để tải lên.", 400);
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return fail("Ảnh vượt quá 5MB.", 413);
  }

  try {
    const file = await upload(image);
    return Response.json({ url: urlOf(file) }, { status: 201 });
  } catch (error) {
    if (error instanceof BackendError) {
      return fail(error.message, error.status === 400 ? 400 : 502);
    }
    throw error;
  }
}

/**
 * Phát ảnh công khai. Tên file là uuid nên nội dung không bao giờ đổi — cache
 * lâu dài. Luồng được chuyển tiếp nguyên vẹn, không nạp cả ảnh vào bộ nhớ.
 */
export async function serveImage(
  fetchImage: () => Promise<Response>,
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetchImage();
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const headers = new Headers();
  for (const key of ["content-type", "content-length"]) {
    const value = upstream.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("x-content-type-options", "nosniff");
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: 200, headers });
}
