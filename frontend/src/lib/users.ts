/**
 * Client gọi backend NestJS. Đây là lớp duy nhất trong frontend biết về backend,
 * chỉ được dùng ở phía server (cần BACKEND_API_KEY, không bao giờ lộ ra browser).
 */
export type StoredUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
};

export type LoginEvent = {
  id: string;
  userId: string;
  provider: string;
  occurredAt: string;
};

const BACKEND_URL = (
  process.env.BACKEND_URL ?? "http://localhost:4000/api"
).replace(/\/$/, "");

class BackendError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "BackendError";
  }
}

/** Gọi backend và bắt buộc phải có dữ liệu trả về, ngược lại throw. */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    const body = await response.text();
    throw new BackendError(
      `Backend trả về ${response.status} cho ${path}: ${body.slice(0, 300)}`,
      response.status,
    );
  }

  return (await response.json()) as T;
}

/** Như `request` nhưng 404 nghĩa là "chưa có dữ liệu" chứ không phải lỗi. */
async function requestOptional<T>(
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

/** Đăng ký (lần đầu) hoặc ghi nhận đăng nhập (các lần sau). */
export async function registerOrLogin(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
}): Promise<{ user: StoredUser; isNewUser: boolean }> {
  return request<{ user: StoredUser; isNewUser: boolean }>("/users/sync", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      name: input.name ?? null,
      image: input.image ?? null,
      provider: input.provider,
    }),
  });
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  return requestOptional<StoredUser>(`/users/${encodeURIComponent(email)}`);
}

export async function getLoginHistory(
  email: string,
  limit = 5,
): Promise<LoginEvent[]> {
  const result = await requestOptional<{ items: LoginEvent[] }>(
    `/users/${encodeURIComponent(email)}/logins?limit=${limit}`,
  );
  return result?.items ?? [];
}
