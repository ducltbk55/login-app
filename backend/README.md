# Backend — NestJS + SQLite

API nội bộ lưu người dùng đăng ký qua Google và lịch sử đăng nhập của họ.
Frontend Next.js (`../frontend`) gọi API này sau khi Google xác thực xong.

Dùng module **`node:sqlite`** có sẵn trong Node.js (>= 22.5) nên không cần cài
native module (`sqlite3`, `better-sqlite3`) hay chạy migration tool nào.

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `src/main.ts` | Bootstrap: prefix `/api`, `ValidationPipe`, CORS, shutdown hooks |
| `src/database/sqlite.service.ts` | Mở kết nối SQLite, tạo bảng (migrate) khi khởi động, helper `transaction()` |
| `src/users/users.service.ts` | Logic đăng ký / ghi nhận đăng nhập, truy vấn người dùng |
| `src/users/users.controller.ts` | REST endpoints `/api/users*` |
| `src/users/user.entity.ts` | Kiểu dữ liệu `User` / `LoginEvent` / `SyncResult` |
| `src/users/dto/sync-user.dto.ts` | Validate payload bằng `class-validator` |
| `src/common/api-key.guard.ts` | Chặn request không có `x-api-key` đúng (so sánh timing-safe) |
| `src/health/health.controller.ts` | `/api/health` (không cần api key) |

## Biến môi trường (`.env.local`)

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
BACKEND_API_KEY=<khoá nội bộ, trùng với frontend>
DATABASE_FILE=data/app.db
```

## Chạy

```bash
npm install
npm run start:dev     # watch mode, http://localhost:4000/api
npm run build && npm run start:prod
```

## Endpoints

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/api/health` | Kiểm tra sống + số người dùng |
| POST | `/api/users/sync` | `{ email, name?, image?, provider }` → `{ user, isNewUser }` |
| GET | `/api/users` | `{ total, items }` |
| GET | `/api/users/:email` | Một người dùng (404 nếu chưa có) |
| GET | `/api/users/:email/logins?limit=20` | Lịch sử đăng nhập (`limit` được kẹp trong 1–100) |

Mọi endpoint `users` cần header `x-api-key: <BACKEND_API_KEY>` (thiếu/không đúng → 401).

`POST /users/sync` chạy trong một transaction: nếu email chưa tồn tại thì INSERT bản ghi mới
(`isNewUser: true`), nếu đã tồn tại thì cập nhật tên/ảnh, `lastLoginAt` và tăng `loginCount`;
cả hai trường hợp đều ghi thêm một dòng vào `login_events`.

## Lược đồ

```sql
users(id TEXT PK, email TEXT UNIQUE, name, image, provider,
      createdAt, lastLoginAt, loginCount INTEGER)

login_events(id TEXT PK, userId TEXT → users(id) ON DELETE CASCADE,
             provider, occurredAt)
```

## Kiểm thử

```bash
npm test           # unit test UsersService trên file SQLite tạm
npm run test:e2e   # e2e: health, api key, sync 2 lần, validation
```

## Muốn đổi sang Postgres/MySQL?

Chỉ cần thay `SqliteService` bằng driver/ORM tương ứng và giữ nguyên interface của
`UsersService` — controller, guard và frontend không phải sửa.
