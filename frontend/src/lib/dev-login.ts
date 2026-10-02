import { request, requestOptional } from "./backend";
import type { StoredUser, StoredUserDetail } from "./users";

/**
 * Đăng nhập nhanh bằng id, KHÔNG qua Google — chỉ dùng khi phát triển.
 *
 * Ba lớp chặn độc lập, cả ba đều kiểm tra lúc chạy — code vẫn nằm trong bản
 * build production, chỉ là không bao giờ chạy tới:
 *  1. `NODE_ENV !== "production"` — provider Credentials không được đăng ký và
 *     route trả 404.
 *  2. Route còn đòi request đến từ localhost (xem `isLocalRequest`), phòng
 *     trường hợp chạy `next dev` rồi mở cho máy khác trong mạng LAN.
 *  3. Backend có cờ `DEV_LOGIN=on` riêng, mặc định tắt. Hai lớp trên nằm cùng
 *     một tiến trình nên cùng bị lừa bởi một sai sót (giả header `Host`,
 *     `NODE_ENV` không được set trong container); lớp này nằm ở tiến trình giữ
 *     dữ liệu nên hỏng độc lập. Đó mới là lớp quyết định: không có nó thì
 *     không tra được người dùng nào để mạo danh.
 *
 * Đã kiểm chứng: `next start` trả 404 và không phát cookie phiên; dev server
 * nhận header `Host: 192.168.x.x` cũng vậy.
 *
 * Muốn tắt hẳn ngay cả khi dev: đặt `DEV_LOGIN=off` trong `.env.local`.
 */
export const DEV_LOGIN_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN !== "off";

/** Id của provider Credentials dành riêng cho việc này. */
export const DEV_LOGIN_PROVIDER = "dev-login";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** Chặn truy cập từ ngoài máy, kể cả khi dev server lắng nghe trên 0.0.0.0. */
export function isLocalRequest(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  // Bỏ cổng: "localhost:3000" -> "localhost"; IPv6 giữ nguyên dạng "[::1]".
  const name = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  return LOCAL_HOSTS.has(name.toLowerCase());
}

/**
 * Cả hai hàm dưới đây đi qua `/dev-login/*` chứ không phải `/users` thường.
 * Nhánh đó bị `DevLoginGuard` chặn khi backend chưa bật cờ, nên tắt ở backend
 * là tính năng chết hẳn dù frontend có nghĩ gì đi nữa.
 */
export async function findUserById(
  id: number,
): Promise<StoredUserDetail | null> {
  return requestOptional<StoredUserDetail>(`/dev-login/users/${id}`);
}

/** Danh sách cho màn hình chọn tài khoản. */
export async function listDevLoginUsers(): Promise<StoredUser[]> {
  const result = await request<{ total: number; items: StoredUser[] }>(
    "/dev-login/users",
  );
  return [...result.items].sort((a, b) => a.id - b.id);
}
