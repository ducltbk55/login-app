# Backend — NestJS + MySQL

API nội bộ lưu người dùng đăng ký qua Google và lịch sử đăng nhập của họ.
Frontend Next.js (`../frontend`) gọi API này sau khi Google xác thực xong.

Lưu dữ liệu trong **MySQL** (database `business-platform`) qua driver `mysql2`.
Không dùng ORM hay migration tool: lúc khởi động backend tự tạo database (nếu
chưa có) và các bảng còn thiếu theo `src/database/schema.ts`.

## Cấu trúc

| Đường dẫn | Vai trò |
| --- | --- |
| `src/main.ts` | Bootstrap: prefix `/api`, `ValidationPipe`, CORS, shutdown hooks |
| `src/database/database.service.ts` | Pool MySQL, tạo database/bảng khi khởi động, helper `all/get/run/transaction()` |
| `src/database/schema.ts` | Lược đồ MySQL (`CREATE TABLE IF NOT EXISTS`) |
| `src/database/migrations/` | Migration dữ liệu chạy một lần mỗi database (danh mục, tỉnh/thành, phường/xã…) |
| `scripts/migrate.ts` | Tạo bảng + chạy migration rồi thoát (`npm run migrate`) |
| `scripts/import-sqlite.ts` | Chép dữ liệu từ file SQLite cũ sang MySQL (`npm run db:import-sqlite`) |
| `src/users/users.service.ts` | Logic đăng ký / ghi nhận đăng nhập, truy vấn người dùng |
| `src/users/users.controller.ts` | REST endpoints `/api/users*` |
| `src/users/user.entity.ts` | Kiểu dữ liệu `User` / `LoginEvent` / `SyncResult` |
| `src/users/dto/sync-user.dto.ts` | Validate payload bằng `class-validator` |
| `src/common/api-key.guard.ts` | Chặn request không có `x-api-key` đúng (so sánh timing-safe) |
| `src/health/health.controller.ts` | `/api/health` (không cần api key) |
| `src/dev-login/` | Mạo danh người dùng theo id, khoá sau cờ `DEV_LOGIN` |
| `src/categories/` | CRUD danh mục + chi tiết danh mục (code tự sinh từ tên) |
| `src/articles/` | CRUD bài viết; chuyên mục lấy từ danh mục `DM_CHUYEN_MUC` |
| `src/contacts/` | Yêu cầu liên hệ từ trang ngoài + tệp đính kèm |
| `src/contacts/attachments.ts` | Allowlist định dạng, sinh tên lưu trữ, chặn path traversal |
| `src/common/article-categories.ts` | Hạt giống danh mục chuyên mục |
| `src/common/validation.ts` | Cấu hình ValidationPipe dùng chung cho app và e2e |
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
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<mật khẩu MySQL>
DB_NAME=business-platform
UPLOAD_DIR=data/uploads   # ảnh & tệp đính kèm
DEV_LOGIN=on      # tuỳ chọn, chỉ dùng khi phát triển — xem mục dưới
```

## Chạy

Cần một MySQL 8 đang chạy; tài khoản trong `DB_USER` phải có quyền tạo database
(hoặc tạo trước: `CREATE DATABASE ``business-platform`` CHARACTER SET utf8mb4;`).

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
| GET | `/api/articles` | `?search=&status=&categoryDetailId=&live=&featured=&page=&pageSize=` |
| GET | `/api/articles/categories` | Chuyên mục đang bật, kèm số bài (`?live=true`) |
| GET | `/api/articles/counts` | Số bài theo từng chuyên mục |
| GET | `/api/articles/slug/:slug` | Một bài theo đường dẫn, cho trang ngoài |
| POST | `/api/articles/slug/:slug/views` | Tăng lượt xem (204) |
| GET/POST | `/api/articles` | Chi tiết theo id / tạo bài |
| GET/PATCH/DELETE | `/api/articles/:id` | Một bài / sửa / xoá |
| GET | `/api/contacts` | `?search=&status=&page=&pageSize=` |
| GET | `/api/contacts/stats` | `{ total, pending, inProgress, resolved }` |
| POST | `/api/contacts` | **multipart**: form liên hệ + `attachment` (tuỳ chọn) |
| GET | `/api/contacts/:id` | Một yêu cầu |
| GET | `/api/contacts/:id/attachment` | Tải/xem tệp đính kèm |
| PATCH | `/api/contacts/:id` | Đổi `status` / `note` (không sửa lời người gửi) |
| DELETE | `/api/contacts/:id` | Xoá yêu cầu **và** tệp đính kèm |
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
-- Mọi khoá chính/khoá ngoại đều là INT AUTO_INCREMENT.
-- Ngày giờ lưu chuỗi ISO 8601 (VARCHAR(30)); collation utf8mb4_unicode_ci.

articles(id INTEGER PK AUTOINCREMENT,
         categoryDetailId INTEGER → category_details(id)   -- chuyên mục
         slug TEXT UNIQUE, title, summary, content, coverImage,
         author, publishedAt, status TEXT (draft|published|archived),
         featured INTEGER, viewCount INTEGER,
         createdAt, updatedAt)
-- Cố ý KHÔNG ON DELETE CASCADE: xoá chuyên mục không được kéo theo bài viết.
-- `readingMinutes` và `live` suy ra lúc đọc, không lưu thành cột.

contacts(id INTEGER PK AUTOINCREMENT,
         name, email, phone, subject, message,
         attachmentName,   -- tên gốc, CHỈ để hiển thị
         attachmentFile,   -- <uuid>.<ext> trên đĩa, dùng để đọc file
         attachmentMime, attachmentSize,
         status TEXT (new|in_progress|resolved|rejected),
         note, handledBy, handledAt, createdAt, updatedAt)
-- Tệp nằm ở data/uploads/contacts/, không phục vụ tĩnh.
-- Xoá liên hệ thì xoá luôn tệp.

permission_groups(id INTEGER PK AUTOINCREMENT, name, slug TEXT UNIQUE, description,
                  createdAt, updatedAt)

permission_group_permissions(groupId → permission_groups(id) ON DELETE CASCADE,
                             permission, PK(groupId, permission))

user_permission_groups(userId → users(id) ON DELETE CASCADE,
                       groupId → permission_groups(id) ON DELETE CASCADE,
                       assignedAt, PK(userId, groupId))
```

## Liên hệ và tệp đính kèm

Form ở trang ngoài ghi thẳng vào bảng `contacts`. Bốn trạng thái:

| Trạng thái | Nghĩa |
| --- | --- |
| `new` | Chưa ai xử lý — con số duy nhất đáng báo động trên trang tổng quan |
| `in_progress` | Đang xử lý |
| `resolved` | Đã xử lý |
| `rejected` | Không xử lý (spam, ngoài phạm vi) — vẫn lưu để còn đối chiếu |

Đổi trạng thái sẽ ghi lại `handledBy` + `handledAt`; sửa ghi chú thì không,
vì ghi chú không phải là xử lý. Trả về `new` thì xoá luôn hai dấu vết đó.

### Tệp đính kèm

Tệp nằm trên đĩa tại `data/uploads/contacts/`, cạnh file DB — sao lưu thư mục
`data/` là có đủ cả hai. DB chỉ giữ thông tin mô tả, **tách làm hai cột**:

- `attachmentFile` — tên do hệ thống sinh (`<uuid>.<ext>`), dùng để đọc file
- `attachmentName` — tên gốc người gửi, **chỉ** để hiển thị lại

Tên người dùng gửi lên không bao giờ chạm tới hệ thống tệp: nó có thể là
`../../.env`, dài 4000 ký tự, hay chứa ký tự Windows không nhận.

Các lớp kiểm soát (xem `contacts/attachments.ts`):

- **Allowlist** định dạng, không phải blocklist. jpg, png, gif, webp, pdf, txt,
  csv, doc, docx, xls, xlsx, zip. Tối đa 5MB, một tệp mỗi yêu cầu.
- **SVG cố ý bị loại.** SVG là XML, trình duyệt chạy `<script>` bên trong khi
  mở trực tiếp — người lạ gửi lên là có XSS ngay trên tên miền của mình.
- **Chỉ ảnh và PDF được `Content-Disposition: inline`**, phần còn lại buộc tải
  về. Luôn kèm `X-Content-Type-Options: nosniff`.
- **Không có đường dẫn công khai.** Thư mục uploads không được phục vụ tĩnh;
  muốn đọc phải qua `/api/contacts/:id/attachment` (cần api key) và ở phía
  Next là `/admin/contacts/:id/attachment` (cần `requireAdmin`).
- `resolveInsideDir` chặn thoát thư mục kể cả khi bản ghi trong DB bị sửa bậy.

Một chi tiết dễ sót: busboy giải mã tham số `filename` theo **latin1**, nên
"Báo cáo quý 1.pdf" tới service thành "BÃ¡o cÃ¡o quÃ½ 1.pdf".
`decodeUploadName` dựng lại đúng dãy byte rồi đọc theo UTF-8.

Test: `src/contacts/contacts.service.spec.ts`, `test/contacts.e2e-spec.ts`.

## Bài viết

Chuyên mục **không** có bảng riêng: nó là chi tiết của danh mục
`DM_CHUYEN_MUC`, được seed lúc khởi động cùng 4 chuyên mục mặc định (Tin nội
bộ, Hoạt động khách hàng, Tin công nghệ, Công nghệ thế giới). Nhờ vậy admin
thêm/sửa/tắt chuyên mục ngay trong màn Danh mục, không cần màn hình riêng —
cùng cơ chế với danh mục quyền.

Ba trạng thái tách bạch vì ý nghĩa khác nhau:

| Trạng thái | Nghĩa |
| --- | --- |
| `draft` | Bản nháp, chưa từng ra mắt |
| `published` | Đã xuất bản |
| `archived` | Đã đăng rồi gỡ xuống (giữ nguyên ngày đăng cũ) |

Trường `live` được suy ra lúc đọc: `published` **và** `publishedAt <= bây giờ`.
Đặt lịch đăng trước là việc bình thường của một toà soạn, nên bài `published`
với ngày ở tương lai vẫn chưa hiện ở trang ngoài. Trang Tin tức gọi
`?live=true` thay vì tự lọc, để quy tắc này chỉ nằm một chỗ.

Vài điểm nữa:

- `slug` duy nhất toàn bảng; trùng thì tự nối `-2`, `-3`… thay vì báo lỗi.
  Đổi tiêu đề **không** đổi slug — link đã chia sẻ ra ngoài phải còn sống.
- `published` mà bỏ trống ngày thì lấy thời điểm hiện tại ("đăng luôn").
- `readingMinutes` suy ra từ độ dài nội dung (200 từ/phút), không lưu cột.
- Khoá ngoại tới `category_details` không CASCADE: xoá chuyên mục đang có bài
  bị chặn bằng 409 kèm thông báo rõ, thay vì để MySQL ném lỗi khoá ngoại.

Test: `src/articles/articles.service.spec.ts`, `test/articles.e2e-spec.ts`.

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
npm test           # unit test, mỗi bộ test dùng một database MySQL tạm (bp_test_*)
npm run test:e2e   # e2e: health, api key, sync, DEV_LOGIN, bài viết, liên hệ
```

Test kết nối bằng `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD` (biến môi trường, hoặc
`.env.local`/`.env.test`), tạo database `bp_test_*` riêng và tự xoá khi xong.

## Migration khi deploy

Mỗi lần khởi động, backend tạo bảng còn thiếu rồi chạy các migration dữ liệu
chưa chạy trong `src/database/migrations/index.ts` (ghi lại ở bảng
`migrations`, mỗi migration một transaction, có `GET_LOCK` chống hai instance
chạy trùng). Muốn chạy riêng ở bước deploy, trước khi bật server:

```bash
npm run migrate          # khi dev (ts-node)
npm run migrate:prod     # sau npm run build: node dist/scripts/migrate.js
```

Migration hiện có:

| Tên | Nội dung |
| --- | --- |
| `2026-10-04-001-categories-from-sqlite` | 6 danh mục xuất từ bản SQLite: quyền (17), chức năng (7), tỉnh/thành phố (34), phường/xã (3321, nhóm theo tỉnh), chuyên mục (4), lĩnh vực sản phẩm (3) |

Migration chỉ **chèn phần còn thiếu** theo `code`, không ghi đè bản ghi admin
đã sửa. Cần thay đổi dữ liệu thì thêm migration mới vào cuối mảng, đừng sửa
migration đã deploy. Test mặc định tắt migration (`DB_SKIP_MIGRATIONS=true`)
để mỗi bộ test bắt đầu từ database trống; xem `src/database/migrations.spec.ts`.

## Chuyển dữ liệu từ SQLite cũ

Bản trước lưu ở `data/app.db`. Chép sang MySQL (giữ nguyên id):

```bash
npm run db:import-sqlite                 # MySQL phải đang trống
npm run db:import-sqlite -- --replace    # xoá dữ liệu MySQL hiện có rồi chép
```
