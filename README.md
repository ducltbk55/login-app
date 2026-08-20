# Đăng ký & Đăng nhập bằng Google — Next.js + NestJS

Monorepo hai phần:

```
login/
├── frontend/   Next.js 16 (App Router) + Auth.js v5 — giao diện & luồng OAuth Google
└── backend/    NestJS 11 + SQLite (node:sqlite) — lưu người dùng & lịch sử đăng nhập
```

- Người dùng bấm **Đăng nhập / Đăng ký với Google** trên frontend.
- Sau khi Google xác thực, frontend (phía server) gọi `POST /api/users/sync` của backend.
- Backend quyết định **đăng ký mới** hay **ghi nhận đăng nhập**, lưu vào SQLite và trả về bản ghi.
- Trang `/dashboard` đọc lại dữ liệu từ backend nên hiển thị đúng những gì đã lưu trong DB.

Frontend không nói chuyện trực tiếp với DB; backend là nơi duy nhất giữ dữ liệu.

## Chạy nhanh

Cần Node.js >= 22.5 (dự án đã test với Node 24 — backend dùng module `node:sqlite` tích hợp,
không phải cài native module nào).

```bash
# 1. Cài dependencies cho cả hai
npm run install:all

# 2. Điền Google OAuth vào frontend/.env.local (xem hướng dẫn bên dưới)

# 3. Mở 2 terminal
npm run dev:backend    # http://localhost:4000/api
npm run dev:frontend   # http://localhost:3000
```

Các script khác ở thư mục gốc: `npm run build`, `npm run lint`, `npm test`.

## Biến môi trường

`.env.local` của cả hai bên đã được tạo sẵn với `AUTH_SECRET` và `BACKEND_API_KEY` ngẫu nhiên
(cùng một khoá ở hai bên). Xem `frontend/.env.example` và `backend/.env.example` để biết chi tiết.

**frontend/.env.local**

| Biến | Ý nghĩa |
| --- | --- |
| `AUTH_SECRET` | Khoá ký cookie/JWT của Auth.js (`npx auth secret`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth client của Google — **bạn cần tự tạo** |
| `BACKEND_URL` | Mặc định `http://localhost:4000/api` |
| `BACKEND_API_KEY` | Phải trùng với `BACKEND_API_KEY` của backend |

**backend/.env.local**

| Biến | Ý nghĩa |
| --- | --- |
| `PORT` | Cổng backend (mặc định 4000) |
| `FRONTEND_ORIGIN` | Origin được phép gọi CORS |
| `BACKEND_API_KEY` | Khoá nội bộ, kiểm tra qua header `x-api-key` |
| `DATABASE_FILE` | File SQLite, mặc định `data/app.db` |

## Tạo Google OAuth Client

1. Vào <https://console.cloud.google.com/apis/credentials>, chọn/tạo project.
2. **OAuth consent screen** → *External* → thêm email của bạn vào **Test users**.
3. **Create credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
4. Dán Client ID / Client secret vào `frontend/.env.local`.

## API của backend

Tất cả route dưới `/api`. Mọi route `users` yêu cầu header `x-api-key: <BACKEND_API_KEY>`.

| Method | Endpoint | Mô tả |
| --- | --- | --- |
| GET | `/api/health` | Kiểm tra sống + số người dùng (không cần api key) |
| POST | `/api/users/sync` | Đăng ký hoặc ghi nhận đăng nhập → `{ user, isNewUser }` |
| GET | `/api/users` | Danh sách người dùng → `{ total, items }` |
| GET | `/api/users/:email` | Chi tiết một người dùng (404 nếu chưa có) |
| GET | `/api/users/:email/logins?limit=20` | Lịch sử đăng nhập (`limit` 1–100, mặc định 20) |

Ví dụ:

```bash
curl -X POST http://localhost:4000/api/users/sync \
  -H "content-type: application/json" \
  -H "x-api-key: $BACKEND_API_KEY" \
  -d '{"email":"an@example.com","name":"An","provider":"google"}'
```

## Lược đồ dữ liệu (SQLite)

```sql
users(id TEXT PK, email TEXT UNIQUE, name, image, provider,
      createdAt, lastLoginAt, loginCount INTEGER)

login_events(id TEXT PK, userId TEXT → users(id) ON DELETE CASCADE,
             provider, occurredAt)
```

`users.email` là UNIQUE nên `POST /users/sync` idempotent: gọi lại nhiều lần chỉ tăng
`loginCount` và thêm một dòng `login_events`, không tạo tài khoản trùng.

## Kiểm thử

```bash
npm --prefix backend test        # unit test UsersService (SQLite tạm)
npm --prefix backend run test:e2e  # e2e: health, api key, sync, validation
```

Chi tiết từng phần: xem `frontend/README.md` và `backend/README.md`.
