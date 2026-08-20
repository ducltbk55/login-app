# Frontend — Next.js + Auth.js (Google OAuth)

Next.js 16 (App Router, TypeScript, Tailwind CSS v4) + [Auth.js / NextAuth v5](https://authjs.dev).
Phần giao diện và luồng OAuth; **dữ liệu người dùng do backend NestJS lưu** (xem `../README.md`).

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `src/auth.ts` | Cấu hình Auth.js: Google provider, callback `jwt` / `session` |
| `src/app/api/auth/[...nextauth]/route.ts` | Route handler xử lý toàn bộ endpoint xác thực |
| `src/app/actions.ts` | Server action `signInWithGoogle` / `signOutAction` |
| `src/lib/users.ts` | **Client gọi backend NestJS** (chỉ chạy phía server) |
| `src/lib/format.ts` | Định dạng thời gian theo giờ Việt Nam |
| `src/app/page.tsx` | Trang chủ, đổi giao diện theo trạng thái đăng nhập |
| `src/app/login/page.tsx` | Trang đăng nhập + thông báo lỗi OAuth bằng tiếng Việt |
| `src/app/dashboard/page.tsx` | Trang cá nhân (được bảo vệ), đọc dữ liệu từ backend |
| `src/components/` | `Card`, `Avatar`, nút đăng nhập Google, nút đăng xuất |
| `src/types/next-auth.d.ts` | Mở rộng kiểu `Session` / `JWT` với các trường tuỳ biến |

## Biến môi trường (`.env.local`)

```env
AUTH_SECRET=<npx auth secret>
AUTH_GOOGLE_ID=<client id>.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=<client secret>
BACKEND_URL=http://localhost:4000/api
BACKEND_API_KEY=<phải trùng với backend>
```

Cách tạo Google OAuth Client: xem `../README.md`.

## Chạy

```bash
npm install
npm run dev      # http://localhost:3000 (cần backend chạy ở cổng 4000)
```

Lệnh khác: `npm run build`, `npm run start`, `npm run lint`.

## Luồng hoạt động

1. Người dùng bấm **Đăng nhập / Đăng ký với Google** → server action gọi `signIn("google")`.
2. Auth.js chuyển hướng sang Google; người dùng chọn tài khoản và cấp quyền.
3. Google gọi lại `/api/auth/callback/google`. Callback `jwt` trong `src/auth.ts` gọi
   `registerOrLogin()` → `POST {BACKEND_URL}/users/sync` (kèm header `x-api-key`).
4. Backend trả về `{ user, isNewUser }`; các trường `userId`, `createdAt`, `loginCount`,
   `isNewUser` được nhét vào JWT rồi ánh xạ sang `session.user` ở callback `session`.
5. Người dùng vào `/dashboard`; trang này gọi tiếp backend để hiển thị bản ghi DB và
   lịch sử đăng nhập.

Nếu backend không chạy, đăng nhập sẽ thất bại và trang `/login` hiện thông báo
"…không lưu được dữ liệu…" thay vì âm thầm mất dữ liệu đăng ký.

## Ghi chú

- Phiên đăng nhập dùng **JWT trong cookie httpOnly** (`session.strategy = "jwt"`), nên
  frontend không cần DB riêng.
- `BACKEND_API_KEY` chỉ được đọc trong code server (`src/lib/users.ts`), không lộ ra browser.
- Trang bảo vệ kiểm tra phiên bằng `await auth()` ngay trong server component — cách kiểm
  tra đáng tin cậy nhất; có thể thêm `middleware.ts` nếu muốn chặn sớm ở tầng edge.
- Ảnh đại diện Google được cho phép qua `images.remotePatterns` trong `next.config.ts`.
- `turbopack.root` được đặt về chính thư mục `frontend` để Next không suy ra thư mục gốc
  của monorepo (nơi cũng có `package-lock.json`).
