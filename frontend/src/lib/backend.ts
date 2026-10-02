/**
 * Tầng gọi backend NestJS dùng chung cho mọi resource. Chỉ chạy phía server:
 * cần BACKEND_API_KEY nên không bao giờ được import vào client component.
 */
const BACKEND_URL = (
  process.env.BACKEND_URL ?? "http://localhost:4000/api"
).replace(/\/$/, "");

export class BackendError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "BackendError";
  }
}

/** Lấy message người-đọc-được từ body lỗi của Nest thay vì in cả JSON thô. */
async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const body = JSON.parse(text) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join("; ");
    if (typeof body.message === "string") return body.message;
  } catch {
    // body không phải JSON thì dùng nguyên văn bên dưới
  }
  return text.slice(0, 300) || `Backend trả về ${response.status}`;
}

/** Gọi backend và bắt buộc phải thành công, ngược lại throw BackendError. */
export async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const apiKey = process.env.BACKEND_API_KEY;
  if (!apiKey) {
    throw new BackendError(
      "Thiếu BACKEND_API_KEY trong .env.local của frontend",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch (cause) {
    throw new BackendError(
      `Không kết nối được backend tại ${BACKEND_URL}. Hãy chắc chắn NestJS đang chạy.`,
      undefined,
      { cause },
    );
  }

  if (!response.ok) {
    throw new BackendError(await readErrorMessage(response), response.status);
  }

  // DELETE trả 204 nên không có body để parse.
  if (response.status === 204) return null as T;

  return (await response.json()) as T;
}

/** Như `request` nhưng 404 nghĩa là "chưa có dữ liệu" chứ không phải lỗi. */
export async function requestOptional<T>(
  path: string,
  init: RequestInit = {},
): Promise<T | null> {
  try {
    return await request<T>(path, init);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) return null;
    throw error;
  }
}

/** Đường dẫn an toàn cho email/id nằm trong URL. */
export function segment(value: string | number): string {
  return encodeURIComponent(String(value));
}
