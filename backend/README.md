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
| `src/dev-login/` | Mạo danh người dùng theo id, khoá sau cờ `DEV_LOGIN` |
| `src/categories/` | CRUD danh mục + chi tiết danh mục (code tự sinh từ tên) |
| `src/permission-groups/` | CRUD nhóm quyền + seed nhóm `administrators` |
| `src/common/permissions.ts` | Hạt giống danh mục quyền + suy ra nhóm hiển thị |
| `src/permission-groups/permission-catalog.service.ts` | Danh mục quyền đọc từ DB (chi tiết của danh mục `DM_QUYEN`) |
| `src/common/slugify.ts` | Sinh slug, bỏ dấu tiếng Việt |
| `src/common/code.ts` | Chuẩn hoá `code` (bỏ dấu, viết hoa) |
| `src/common/search.ts` | So khớp không phân biệt hoa thường/dấu |
| `src/common/pagination.ts` | Cắt trang (mặc định 20, tối đa 200/trang) |
| `scripts/set-role.mjs` | Bootstrap admin đầu tiên (`npm run set-role`) |
| `scripts/seed-vn-administrative.ts` | Nạp 34 tỉnh/thành + 3321 phường/xã (`npm run seed:vn`) |
| `src/categories/vn-administrative-order.ts` | Quy tắc sắp xếp: thành phố trước tỉnh, phường trước xã trước đặc khu |

## Biến môi trường (`.env.local`)

```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
BACKEND_API_KEY=<khoá nội bộ, trùng với frontend>
DATABASE_FILE=data/app.db
DEV_LOGIN=on      # tuỳ chọn, chỉ dùng khi phát triển — xem mục dưới
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
| POST | `/api/users/sync` | `{ email, name?, image?, provider, mode }` — `register` tạo tài khoản chờ duyệt (409 nếu email đã có), `login` đòi tài khoản đã duyệt (404 chưa đăng ký / 403 chờ duyệt hoặc bị khoá) |
| GET | `/api/users` | `{ total, items }` |
| GET | `/api/users/:email` | Một người dùng (404 nếu chưa có) |
| GET | `/api/users/:email/logins?limit=20` | Lịch sử đăng nhập (`limit` được kẹp trong 1–100) |
| GET | `/api/users/stats` | `{ total, admins, pending, blocked }` |
| PATCH | `/api/users/:email` | Đổi `role` / `status` |
| PATCH | `/api/users/:email/profile` | Chủ tài khoản tự khai hồ sơ (sđt, giới tính, ngày sinh, địa chỉ) |
| PUT | `/api/users/:email/groups` | Thay toàn bộ nhóm quyền của user |
| GET | `/api/address/provinces` | Tỉnh/thành cho ô chọn địa chỉ |
| GET | `/api/address/wards?provinceCode=` | Phường/xã của một tỉnh |
| GET | `/api/permissions` | Quyền đang bật, đọc từ danh mục `DM_QUYEN` |
| GET/POST | `/api/permission-groups` | Danh sách / tạo nhóm quyền |
| GET/PATCH/DELETE | `/api/permission-groups/:id` | Chi tiết / sửa / xoá |
| GET/POST | `/api/categories` | Danh sách (`?search=&status=&page=&pageSize=`) / tạo |
| GET/PATCH/DELETE | `/api/categories/:id` | Chi tiết / sửa / xoá |
| GET/POST | `/api/categories/:id/details` | Chi tiết của danh mục (`?search=&status=&groupDetailId=&page=&pageSize=`) / tạo |
| GET/PATCH/DELETE | `/api/categories/:id/details/:detailId` | Một chi tiết / sửa / xoá |
| GET | `/api/dev-login/users` | Tài khoản để mạo danh — 403 nếu `DEV_LOGIN` chưa bật |
| GET | `/api/dev-login/users/:id` | Một tài khoản theo **id** — 403 nếu chưa bật |

Mọi endpoint (trừ `/api/health`) cần header `x-api-key: <BACKEND_API_KEY>` — thiếu/không đúng → 401.
Backend chỉ tin transport: việc kiểm tra *ai* là admin do Next.js làm (xem `frontend/src/lib/admin.ts`).

`POST /users/sync` chạy trong một transaction và tách hai luồng theo `mode`:

- `register`: email đã có → 409; chưa có → INSERT với `status = 'inactive'` và
  `loginCount = 0`, **không** ghi `login_events` (chưa đăng nhập được).
- `login`: không tìm thấy → 404; `inactive` → 403 (chờ duyệt); `blocked` → 403;
  hợp lệ → cập nhật tên/ảnh, `lastLoginAt`, tăng `loginCount` và ghi `login_events`.

Quản trị viên duyệt tài khoản bằng `PATCH /users/:email` với `status: 'active'`.

## Lược đồ

```sql
users(id INTEGER PK AUTOINCREMENT, accountId TEXT UNIQUE,
      email TEXT UNIQUE, name, image, provider,
      createdAt, lastLoginAt, loginCount INTEGER,
      -- hồ sơ người dùng tự khai sau khi đăng nhập, đều NULL được
      phone, gender (male|female|other), birthDate (YYYY-MM-DD),
      addressLine, provinceCode, wardCode)
-- provinceCode / wardCode lưu `code` của chi tiết trong DM_TINH_TP và
-- DM_PHUONG_XA. Cố ý lưu mã chứ không phải khoá ngoại: admin xoá một phường
-- thì hồ sơ cũ không bị kéo theo.
-- `profileCompleted` suy ra lúc đọc (đủ 6 trường trên), không lưu thành cột.

login_events(id INTEGER PK AUTOINCREMENT,
             userId INTEGER → users(id) ON DELETE CASCADE,
             provider, occurredAt)

-- users có thêm: role TEXT (admin|user),
--                status TEXT (active|inactive|blocked)
--                inactive = vừa đăng ký, chờ quản trị viên duyệt
-- hai cột này được thêm bằng ALTER TABLE nên DB cũ vẫn migrate được
-- accountId giữ GUID cũ (trước đây chính là cột id)

categories(id INTEGER PK AUTOINCREMENT, code TEXT UNIQUE, name, descriptions,
           "order" INTEGER, status TEXT (active|inactive),
           groupCategoryId → categories(id) NULL,
           createdAt, updatedAt)

category_details(id INTEGER PK AUTOINCREMENT,
                 categoryId → categories(id) ON DELETE CASCADE,
                 code, name, descriptions, "order" INTEGER,
                 status TEXT (active|inactive),
                 groupDetailId → category_details(id) NULL,
                 createdAt, updatedAt,
                 UNIQUE(categoryId, code))

-- Phân nhóm: danh mục có thể lấy danh mục khác làm nhóm (groupCategoryId).
-- Khi đó mỗi chi tiết bắt buộc thuộc về một chi tiết của danh mục nhóm đó
-- (groupDetailId). Ví dụ: "Phường/Xã" nhóm theo "Tỉnh", "Danh mục quyền"
-- nhóm theo "Danh mục chức năng".
-- Không xoá được danh mục/chi tiết đang được dùng làm nhóm (409).
-- Đổi hoặc bỏ danh mục nhóm sẽ xoá groupDetailId của mọi chi tiết bên trong.
-- Danh sách chi tiết của danh mục có nhóm được xếp theo nhóm trước, nên các
-- chi tiết cùng nhóm luôn nằm liền khối khi phân trang.
-- code của categories là duy nhất toàn bảng; code của category_details chỉ
-- cần duy nhất trong phạm vi một danh mục
--
-- Danh mục quyền: category có code 'DM_QUYEN', nhóm theo
-- 'DM_CHUC_NANG'. Mỗi chi tiết là một quyền của hệ thống (code chi tiết
-- = mã quyền lưu trong permission_group_permissions), thuộc về một chức năng.
-- Lúc khởi động, quyền mặc định nào còn thiếu thì được chèn thêm; admin thêm
-- quyền mới bằng cách thêm chi tiết, tắt quyền thì nó không gán được nữa.
-- Mã quyền cũ viết thường được migrate thành chữ hoa cho khớp với code.
-- Mọi khoá chính/khoá ngoại đều là INTEGER tự tăng.
-- DB cũ được migrate tự động lúc khởi động, qua hai bước:
--   1) categories: slug/description/sortOrder/isActive -> code/descriptions/"order"/status
--   2) toàn bộ khoá GUID (TEXT) -> INTEGER, GUID của users dời sang cột accountId
-- Khoá ngoại được trỏ lại bằng bảng ánh xạ tạm nên quan hệ cha-con giữ nguyên.
-- Regression test: src/database/sqlite.service.spec.ts

permission_groups(id INTEGER PK AUTOINCREMENT, name, slug TEXT UNIQUE, description,
                  createdAt, updatedAt)

permission_group_permissions(groupId → permission_groups(id) ON DELETE CASCADE,
                             permission, PK(groupId, permission))

user_permission_groups(userId → users(id) ON DELETE CASCADE,
                       groupId → permission_groups(id) ON DELETE CASCADE,
                       assignedAt, PK(userId, groupId))
```

## Đăng nhập theo id khi phát triển

Frontend có `/dev-login/<id>` tạo phiên thẳng, không qua Google. Nó gọi
`/api/dev-login/*`, và nhánh này bị `DevLoginGuard` chặn trừ khi
`DEV_LOGIN=on` — **mặc định tắt**, thiếu cấu hình là không dùng được.

Cố tình không dựa vào `NODE_ENV`: `npm run start:prod` ở đây là
`node dist/main`, không đặt biến đó, nên `NODE_ENV !== 'production'` sẽ luôn
đúng ngay cả trên máy chủ thật. Cờ bật tường minh mới là thứ chặn được.

Đây là lớp phòng thủ thứ hai. Frontend cũng tự chặn (`NODE_ENV` + host phải là
localhost), nhưng hai lớp đó nằm cùng một tiến trình nên cùng hỏng vì một sai
sót. Cờ ở backend hỏng độc lập: frontend có bị lừa thì vẫn không tra được tài
khoản nào để mạo danh.

**Đừng bật trên máy chủ thật.** Ai gọi được API nội bộ sẽ lấy được phiên của
bất kỳ tài khoản nào, kể cả admin, bỏ qua cả trạng thái chờ duyệt/bị khoá.

Test: `src/dev-login/dev-login.guard.spec.ts` và `test/dev-login.e2e-spec.ts`.

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
npm run test:e2e   # e2e: health, api key, sync 2 lần, validation, cổng DEV_LOGIN
```

## Muốn đổi sang Postgres/MySQL?

Chỉ cần thay `SqliteService` bằng driver/ORM tương ứng và giữ nguyên interface của
`UsersService` — controller, guard và frontend không phải sửa.
