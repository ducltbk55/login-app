# Deploy

Toàn bộ hệ thống chạy bằng Docker, nginx đứng trước:

```
internet ──► nginx :80/:443 ──► frontend (Next.js :3000) ──► backend (NestJS :4000) ──► db (MariaDB/MySQL)
              │ SSL Let's Encrypt         chỉ nginx mở cổng ra ngoài; backend/db nằm trong mạng nội bộ Docker
```

| Container | Image | Ghi chú |
| --- | --- | --- |
| `nginx` | `nginx:1.27-alpine` | Reverse proxy, HTTPS, tự reload để nhận chứng chỉ gia hạn |
| `frontend` | build từ `frontend/Dockerfile` | Next.js standalone |
| `backend` | build từ `backend/Dockerfile` | Tự tạo bảng + chạy migration khi khởi động; ảnh upload ở volume `uploads` |
| `db` | `mariadb:11.4` (đổi bằng `DB_IMAGE`, vd. `mysql:8.4`) | Dữ liệu ở volume `db-data` |
| `certbot-renew` | `certbot/certbot` | Chỉ khi `SSL_ENABLED=true`, gia hạn 12 giờ/lần |

## Lệnh

Chạy từ thư mục gốc dự án, **trong WSL** (Windows không có `make`; lần đầu cài: `sudo apt install make`):

```bash
make init production      # tạo deploy/env/production.env, sinh sẵn mật khẩu DB + secret
make deploy production    # deploy lên máy chủ qua SSH

make init local
make deploy local         # deploy vào WSL → http://localhost:8080

make status <production|local>   # trạng thái container
make logs   <production|local>   # xem log
make backup <production|local>   # dump DB về deploy/backups/*.sql.gz
make down   <production|local>   # dừng (giữ dữ liệu)
```

`status`, `logs`, `down`, `backup` cũng chạy được ngay trên máy đích, trong thư mục
đã deploy (`<DEPLOY_PATH>/app`, vd. `~/apps/business-platform/app`): script dùng
`<DEPLOY_PATH>/.env` của hệ thống đang chạy. Riêng `deploy` phải chạy từ thư mục
mã nguồn (nơi có `deploy/env/*.env`).

Không có `make` thì gọi thẳng script, kể cả từ Git Bash trên Windows (deploy local
sẽ tự chuyển vào WSL):

```bash
bash deploy/deploy.sh deploy local
bash deploy/deploy.sh deploy production
```

## Cấu hình

Mỗi môi trường một file `deploy/env/<môi trường>.env`, tạo từ file `*.env.example`
bằng `make init`. File thật chứa mật khẩu nên **không được commit** (đã ignore).

| Nhóm | Biến |
| --- | --- |
| Máy chủ | `SERVER_HOST`, `SERVER_USER`, `SERVER_PORT`, `SSH_KEY`, `DEPLOY_PATH`, `INSTALL_DOCKER`, `DEPLOY_IN_PLACE` (local) |
| Domain | `DOMAIN`, `SSL_ENABLED`, `LETSENCRYPT_EMAIL`, `HTTP_PORT`, `HTTPS_PORT` |
| Database | `DB_IMAGE`, `DB_NAME` (mặc định `business-platform`), `DB_USER`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `DB_PUBLISH_PORT` |
| Ứng dụng | `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `BACKEND_API_KEY`, `NEXT_PUBLIC_CKEDITOR_LICENSE_KEY`, `TZ` |

`APP_URL` (dùng cho đăng nhập Google và CORS) được suy ra từ `DOMAIN` + SSL + cổng.

### Deploy local không chép code (`DEPLOY_IN_PLACE`)

Mặc định `make deploy local` chép code sang `DEPLOY_PATH/app` rồi build ở đó. Nếu
đã clone dự án vào WSL, đặt `DEPLOY_IN_PLACE=true` trong `deploy/env/local.env` để
build & chạy thẳng từ thư mục mã nguồn:

- `DEPLOY_PATH` bị bỏ qua; `.env` của hệ thống ghi ở `deploy/.runtime/local.env` (đã ignore).
- Không còn bản `app.prev`; code đang sửa dở cũng được build vào lần deploy sau.
- Dữ liệu (volume) vẫn giữ nguyên khi chuyển qua lại giữa hai chế độ, vì cùng
  `COMPOSE_PROJECT_NAME`. Thư mục `DEPLOY_PATH` cũ có thể xoá.
- Chỉ áp dụng cho `local`; production luôn chép qua SSH.
- Đừng clone code vào đúng `DEPLOY_PATH/app` khi dùng chế độ chép: deploy sẽ đổi
  nó thành `app.prev` và lần sau xoá mất.

## Deploy production làm gì

1. SSH vào `SERVER_USER@SERVER_HOST`, kiểm tra Docker (thiếu thì cài nếu `INSTALL_DOCKER=true`).
2. Nén code (bỏ `node_modules`, build, `.env*`, dữ liệu dev) và chép sang
   `DEPLOY_PATH/app`; bản trước giữ ở `app.prev`.
3. Ghi `DEPLOY_PATH/.env` (quyền 600) — chỉ biến container cần, không có thông tin SSH.
4. Trên máy chủ (`deploy/scripts/up.sh`): build image → bật DB → chạy migration →
   bật backend + frontend (chờ healthy) → nginx. Lần đầu bật SSL thì xin chứng
   chỉ Let's Encrypt trước rồi mới chuyển nginx sang HTTPS.
5. Gọi thử trang chủ qua nginx; lỗi thì in trạng thái container và dừng.

Dữ liệu (DB, ảnh upload, chứng chỉ) nằm trong Docker volume nên deploy lại không mất.

### Trước lần deploy production đầu tiên

- Máy chủ Linux (Ubuntu/Debian…) có SSH bằng khoá, mở cổng 80 và 443.
- Bản ghi DNS `A` của `DOMAIN` trỏ về `SERVER_HOST` (Let's Encrypt cần kiểm tra).
- Google OAuth: thêm Authorized redirect URI `https://<DOMAIN>/api/auth/callback/google`
  (local: `http://localhost:8080/api/auth/callback/google`).

### Dữ liệu cũ

Database mới chỉ có dữ liệu do migration tạo (danh mục, tỉnh/thành, phường/xã,
quyền). Tài khoản admin đầu tiên: đăng ký bằng Google rồi nâng quyền:

```bash
# trên máy đích, trong DEPLOY_PATH
docker compose --env-file .env -f app/deploy/docker-compose.yml exec db \
  sh -c 'mariadb -uroot -p"$MYSQL_ROOT_PASSWORD" business-platform \
  -e "UPDATE users SET role=\"admin\", status=\"active\" WHERE email=\"ban@gmail.com\""'
```
