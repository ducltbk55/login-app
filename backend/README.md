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
| `src/categories/` | CRUD danh mục (slug duy nhất, tự sinh từ tên) |
| `src/permission-groups/` | CRUD nhóm quyền + seed nhóm `administrators` |
| `src/common/permissions.ts` | Danh mục quyền cố định của hệ thống |
| `src/common/slugify.ts` | Sinh slug, bỏ dấu tiếng Việt |
| `src/common/search.ts` | So khớp không phân biệt hoa thường/dấu |
| `scripts/set-role.mjs` | Bootstrap admin đầu tiên (`npm run set-role`) |

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
| GET | `/api/users/stats` | `{ total, admins, blocked }` |
| PATCH | `/api/users/:email` | Đổi `role` / `status` |
| PUT | `/api/users/:email/groups` | Thay toàn bộ nhóm quyền của user |
| GET | `/api/permissions` | Danh mục quyền cố định |
| GET/POST | `/api/permission-groups` | Danh sách / tạo nhóm quyền |
| GET/PATCH/DELETE | `/api/permission-groups/:id` | Chi tiết / sửa / xoá |
| GET/POST | `/api/categories` | Danh sách (`?search=&isActive=`) / tạo |
| GET/PATCH/DELETE | `/api/categories/:id` | Chi tiết / sửa / xoá |

Mọi endpoint (trừ `/api/health`) cần header `x-api-key: <BACKEND_API_KEY>` — thiếu/không đúng → 401.
Backend chỉ tin transport: việc kiểm tra *ai* là admin do Next.js làm (xem `frontend/src/lib/admin.ts`).

`POST /users/sync` chạy trong một transaction: nếu email chưa tồn tại thì INSERT bản ghi mới
(`isNewUser: true`), nếu đã tồn tại thì cập nhật tên/ảnh, `lastLoginAt` và tăng `loginCount`;
cả hai trường hợp đều ghi thêm một dòng vào `login_events`.

## Lược đồ

```sql
users(id TEXT PK, email TEXT UNIQUE, name, image, provider,
      createdAt, lastLoginAt, loginCount INTEGER)

login_events(id TEXT PK, userId TEXT → users(id) ON DELETE CASCADE,
             provider, occurredAt)

-- users có thêm: role TEXT (admin|user), status TEXT (active|blocked)
-- hai cột này được thêm bằng ALTER TABLE nên DB cũ vẫn migrate được

categories(id TEXT PK, name, slug TEXT UNIQUE, description,
           sortOrder INTEGER, isActive INTEGER, createdAt, updatedAt)

permission_groups(id TEXT PK, name, slug TEXT UNIQUE, description,
                  createdAt, updatedAt)

permission_group_permissions(groupId → permission_groups(id) ON DELETE CASCADE,
                             permission, PK(groupId, permission))

user_permission_groups(userId → users(id) ON DELETE CASCADE,
                       groupId → permission_groups(id) ON DELETE CASCADE,
                       assignedAt, PK(userId, groupId))
```

## Bootstrap admin đầu tiên

Role chỉ đổi được từ trong trang admin, mà muốn vào trang admin thì đã phải là admin —
nên tài khoản đầu tiên phải nâng quyền từ CLI (sau khi đã đăng nhập Google một lần):

```bash
npm run set-role -- ban@gmail.com admin   # nâng quyền
npm run set-role -- ban@gmail.com user    # hạ quyền
```

## Kiểm thử

```bash
npm test           # unit test UsersService trên file SQLite tạm
npm run test:e2e   # e2e: health, api key, sync 2 lần, validation
```

## Muốn đổi sang Postgres/MySQL?

Chỉ cần thay `SqliteService` bằng driver/ORM tương ứng và giữ nguyên interface của
`UsersService` — controller, guard và frontend không phải sửa.
