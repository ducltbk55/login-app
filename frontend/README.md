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
| `src/app/admin/` | **Khu quản trị** `/admin/*` — layout tự chặn non-admin |
| `src/lib/admin.ts` | `requireAdmin()` — cổng vào, đọc role từ DB chứ không từ JWT |
| `src/lib/backend.ts` | Tầng gọi backend dùng chung (`request` / `requestOptional`) |
| `src/lib/categories.ts`, `src/lib/permission-groups.ts` | Client cho từng resource |
| `src/lib/styles.ts` | Class Tailwind dùng lại (nút, input, bảng) |
| `src/components/` | `Card`, `Avatar`, `Badge`, form admin, nút submit/xoá |
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

## Khu quản trị `/admin/*`

| Route | Chức năng |
| --- | --- |
| `/admin` | Tổng quan: số người dùng / admin / bị khoá / danh mục / nhóm quyền |
| `/admin/users` | Danh sách + lọc theo tên, vai trò, trạng thái |
| `/admin/users/[email]` | Đổi role & status, gán nhóm quyền, xem quyền hiệu lực + lịch sử |
| `/admin/categories` | Danh sách + lọc, bật/tắt nhanh, xoá |
| `/admin/categories/new`, `/admin/categories/[id]` | Thêm / sửa |
| `/admin/permission-groups` | Danh sách kèm số thành viên, xoá |
| `/admin/permission-groups/new`, `/[id]` | Thêm / sửa, chọn quyền bằng checkbox |

Cách phân quyền:

- Cổng vào là `users.role === "admin"` **và** `status === "active"`, kiểm tra trong
  `app/admin/layout.tsx` nên mọi trang con (kể cả trang thêm sau này) đều được bảo vệ.
- `requireAdmin()` đọc lại từ DB mỗi request, **không** tin `session.user.role`: JWT là
  ảnh chụp lúc đăng nhập nên nếu tin nó thì hạ quyền/khoá tài khoản sẽ không có hiệu lực
  cho tới khi hết phiên. Cookie tự khai `role: "admin"` cũng không vào được.
- Mỗi server action tự gọi `requireAdmin()`: server action là endpoint HTTP riêng, không
  thừa hưởng bảo vệ của layout.
- Nhóm quyền hiện là dữ liệu được quản lý + `permissions` hiệu lực trả về theo user; cổng
  `/admin` vẫn dựa trên `role`. Muốn siết theo từng quyền thì kiểm tra
  `user.permissions.includes("categories.write")` tại action/trang tương ứng.

## Ghi chú

- Phiên đăng nhập dùng **JWT trong cookie httpOnly** (`session.strategy = "jwt"`), nên
  frontend không cần DB riêng.
- `BACKEND_API_KEY` chỉ được đọc trong code server (`src/lib/backend.ts`), không lộ ra browser.
- Trang bảo vệ kiểm tra phiên bằng `await auth()` ngay trong server component — cách kiểm
  tra đáng tin cậy nhất; có thể thêm `middleware.ts` nếu muốn chặn sớm ở tầng edge.
- Ảnh đại diện Google được cho phép qua `images.remotePatterns` trong `next.config.ts`.
- `turbopack.root` được đặt về chính thư mục `frontend` để Next không suy ra thư mục gốc
  của monorepo (nơi cũng có `package-lock.json`).
