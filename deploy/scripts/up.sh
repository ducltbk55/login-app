#!/usr/bin/env bash
# Chạy TRÊN máy đích (máy chủ production hoặc WSL), trong thư mục code đã chép sang.
#   bash deploy/scripts/up.sh <đường dẫn file .env>
#
# Build image, bật DB, chạy migration, bật backend/frontend, rồi cấu hình nginx
# (xin chứng chỉ Let's Encrypt lần đầu nếu SSL_ENABLED=true).
set -euo pipefail

ENV_FILE=${1:?Thiếu đường dẫn file .env}
cd "$(dirname "$0")/../.."

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

log() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

compose=(docker compose --env-file "$ENV_FILE" -f deploy/docker-compose.yml)
if [[ -n "${DB_PUBLISH_PORT:-}" ]]; then
  compose+=(-f deploy/docker-compose.db-port.yml)
fi

log "Build image frontend + backend"
"${compose[@]}" build --pull

log "Khởi động database"
"${compose[@]}" up -d --wait db

# Chạy riêng trước khi bật backend: migration lỗi thì dừng ở đây, bản đang
# chạy vẫn phục vụ bình thường. Backend cũng tự migrate khi khởi động.
log "Chạy migration"
"${compose[@]}" run --rm --no-deps backend node dist/scripts/migrate.js

log "Khởi động backend + frontend"
"${compose[@]}" up -d --wait backend frontend

cert_exists() {
  "${compose[@]}" run --rm --no-deps --entrypoint sh certbot \
    -c "test -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem" >/dev/null 2>&1
}

if [[ "${SSL_ENABLED:-false}" == "true" ]]; then
  if ! cert_exists; then
    log "Xin chứng chỉ Let's Encrypt cho ${DOMAIN}"
    # Nginx chạy HTTP trước để Let's Encrypt truy cập được /.well-known/acme-challenge.
    NGINX_MODE=http "${compose[@]}" up -d --force-recreate nginx
    "${compose[@]}" run --rm --no-deps certbot certonly \
      --webroot -w /var/www/certbot \
      -d "${DOMAIN}" \
      --email "${LETSENCRYPT_EMAIL:?Thiếu LETSENCRYPT_EMAIL}" \
      --agree-tos --no-eff-email --non-interactive
  fi

  log "Bật nginx (HTTPS)"
  NGINX_MODE=https "${compose[@]}" up -d --force-recreate nginx
  COMPOSE_PROFILES=ssl "${compose[@]}" up -d certbot-renew
else
  log "Bật nginx (HTTP)"
  NGINX_MODE=http "${compose[@]}" up -d --force-recreate nginx
fi

log "Kiểm tra trang chủ qua nginx"
if [[ "${SSL_ENABLED:-false}" == "true" ]]; then
  url="https://${DOMAIN}:${HTTPS_PORT:-443}/"
  check=(curl -fsS -o /dev/null --resolve "${DOMAIN}:${HTTPS_PORT:-443}:127.0.0.1" "$url")
else
  url="http://127.0.0.1:${HTTP_PORT:-80}/"
  check=(curl -fsS -o /dev/null -H "Host: ${DOMAIN}" "$url")
fi
for attempt in $(seq 1 30); do
  if "${check[@]}" 2>/dev/null; then
    ok=1
    break
  fi
  sleep 2
done
if [[ -z "${ok:-}" ]]; then
  echo "Trang chủ chưa phản hồi qua nginx ($url). Xem log: make logs <môi trường>" >&2
  "${compose[@]}" ps
  exit 1
fi

# Dọn image cũ không còn dùng (giữ dung lượng đĩa máy chủ).
docker image prune -f >/dev/null

"${compose[@]}" ps
log "Deploy xong: ${APP_URL}"
