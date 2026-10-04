#!/usr/bin/env bash
# Deploy hệ thống bằng Docker + nginx.
#
#   bash deploy/deploy.sh <lệnh> <môi trường>
#   (hoặc qua Makefile: make <lệnh> <môi trường>)
#
# Lệnh:
#   init     tạo deploy/env/<môi trường>.env từ file mẫu, sinh sẵn mật khẩu/secret
#   deploy   build & chạy (nginx, frontend, backend, db); production chép code
#            sang máy chủ trước, local chạy thẳng tại thư mục mã nguồn này
#   status   xem trạng thái container
#   logs     xem log (theo dõi liên tục)
#   down     dừng hệ thống (giữ nguyên dữ liệu trong volume)
#   backup   tải bản dump database về deploy/backups/
#
# Môi trường:
#   production   máy chủ qua SSH (SERVER_HOST, SERVER_USER...)
#   local        WSL trên máy này
set -euo pipefail

COMMAND=${1:-}
TARGET=${2:-}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
ENV_FILE="$ROOT/deploy/env/$TARGET.env"

die() { printf '\033[1;31mLỗi:\033[0m %s\n' "$*" >&2; exit 1; }
log() { printf '\033[1;36m==> %s\033[0m\n' "$*"; }

usage() {
  sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

[[ -n "$COMMAND" && -n "$TARGET" ]] || usage
[[ "$TARGET" == "production" || "$TARGET" == "local" ]] ||
  die "Môi trường không hợp lệ: $TARGET (production | local)"

# Trên Windows (Git Bash), deploy local phải chạy bên trong WSL nơi có Docker.
if [[ "$TARGET" == "local" ]]; then
  case "$(uname -s)" in
    MINGW* | MSYS* | CYGWIN*)
      command -v wsl >/dev/null || die "Không tìm thấy WSL."
      # Truyền đường dẫn Windows: Git Bash tự "sửa" đường dẫn dạng /mnt/... khi
      # gọi chương trình Windows, còn `wsl --cd` hiểu được cả D:\...
      log "Chuyển sang WSL"
      MSYS_NO_PATHCONV=1 exec wsl --cd "$(cd "$ROOT" && pwd -W)" \
        bash deploy/deploy.sh "$COMMAND" "$TARGET"
      ;;
  esac
fi

# ---------------------------------------------------------------- init
random_secret() { openssl rand -hex 32; }

cmd_init() {
  local example="$ROOT/deploy/env/$TARGET.env.example"
  [[ -f "$ENV_FILE" ]] && die "$ENV_FILE đã có — sửa trực tiếp file đó."
  cp "$example" "$ENV_FILE"

  # Điền sẵn các secret còn trống; thông tin máy chủ/domain bạn tự sửa.
  local key
  for key in DB_PASSWORD DB_ROOT_PASSWORD AUTH_SECRET BACKEND_API_KEY; do
    sed -i "s|^$key=\$|$key=$(random_secret)|" "$ENV_FILE"
  done
  chmod 600 "$ENV_FILE"
  log "Đã tạo $ENV_FILE — hãy kiểm tra máy chủ, domain và Google OAuth trong đó."
}

if [[ "$COMMAND" == "init" ]]; then
  cmd_init
  exit 0
fi

# ---------------------------------------------------------------- cấu hình
BACKUP_DIR="$ROOT/deploy/backups"

# Đang đứng trong thư mục đã deploy (<DEPLOY_PATH>/app): bản chép không mang
# deploy/env/*.env, nhưng ngay trên nó có .env của hệ thống đang chạy. Khi đó
# các lệnh vận hành chạy thẳng tại chỗ, bất kể môi trường ghi trên dòng lệnh.
INSTALLED_ENV="$(dirname "$ROOT")/.env"
INSTALLED=false
if [[ ! -f "$ENV_FILE" && -f "$INSTALLED_ENV" ]]; then
  case "$COMMAND" in
    status | logs | down | backup)
      INSTALLED=true
      ENV_FILE="$INSTALLED_ENV"
      BACKUP_DIR="$(dirname "$ROOT")/backups"
      ;;
    deploy)
      die "Đây là thư mục đã deploy. Hãy chạy 'make deploy $TARGET' từ thư mục mã nguồn dự án."
      ;;
  esac
fi

[[ -f "$ENV_FILE" ]] || die "Chưa có $ENV_FILE. Chạy: make init $TARGET"

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

require() {
  local key
  for key in "$@"; do
    [[ -n "${!key:-}" ]] || die "Thiếu $key trong $ENV_FILE"
  done
}

if [[ "$INSTALLED" == "true" ]]; then
  DEPLOY_PATH="$(dirname "$ROOT")"
elif [[ "$TARGET" == "production" && -n "${DEPLOY_PATH:-}" ]]; then
  # Lúc đọc file .env, bash đã đổi `~` thành home của máy local; trả lại `~`
  # để nó trỏ về home của SERVER_USER trên máy chủ.
  case "$DEPLOY_PATH" in
    "$HOME" | "$HOME"/*) DEPLOY_PATH="~${DEPLOY_PATH#"$HOME"}" ;;
  esac
fi

# Local luôn build & chạy thẳng từ thư mục mã nguồn này, không chép đi đâu.
IN_PLACE=false
if [[ "$TARGET" == "local" && "$INSTALLED" != "true" ]]; then
  IN_PLACE=true
fi

[[ "$IN_PLACE" == "true" ]] || require DEPLOY_PATH
require DOMAIN DB_NAME DB_USER DB_PASSWORD DB_ROOT_PASSWORD \
  AUTH_SECRET BACKEND_API_KEY
if [[ "$TARGET" == "production" && "$INSTALLED" != "true" ]]; then
  require SERVER_HOST SERVER_USER
  [[ "${SSL_ENABLED:-false}" != "true" ]] || require LETSENCRYPT_EMAIL
fi

HTTP_PORT=${HTTP_PORT:-80}
HTTPS_PORT=${HTTPS_PORT:-443}
COMPOSE_PROJECT_NAME=${COMPOSE_PROJECT_NAME:-business-platform}

# URL công khai: Auth.js (đăng nhập Google) và CORS của backend cần đúng giá trị này.
if [[ "${SSL_ENABLED:-false}" == "true" ]]; then
  APP_URL="https://$DOMAIN"
  [[ "$HTTPS_PORT" == "443" ]] || APP_URL+=":$HTTPS_PORT"
else
  APP_URL="http://$DOMAIN"
  [[ "$HTTP_PORT" == "80" ]] || APP_URL+=":$HTTP_PORT"
fi

# ---------------------------------------------------------------- chạy lệnh trên máy đích
SSH_OPTS=(-o ControlMaster=auto -o "ControlPath=$HOME/.ssh/bp-%r@%h:%p"
  -o ControlPersist=120 -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15
  -p "${SERVER_PORT:-22}")
if [[ -n "${SSH_KEY:-}" ]]; then
  SSH_OPTS+=(-i "${SSH_KEY/#\~/$HOME}")
fi

# remote <lệnh bash>: chạy trên máy chủ qua SSH, hoặc ngay trong WSL khi local.
remote() {
  if [[ "$TARGET" == "production" && "$INSTALLED" != "true" ]]; then
    ssh "${SSH_OPTS[@]}" "$SERVER_USER@$SERVER_HOST" "bash -lc $(printf '%q' "$1")"
  else
    bash -lc "$1"
  fi
}

# Đặt biến trên máy đích: $app = thư mục code, $env = file .env của hệ thống.
# Bình thường: <DEPLOY_PATH>/app và <DEPLOY_PATH>/.env (`~` mở rộng phía máy đích).
# Local: chính thư mục mã nguồn, .env sinh ra ở deploy/.runtime/.
if [[ "$IN_PLACE" == "true" ]]; then
  REMOTE_DIR_EXPR="app=$(printf '%q' "$ROOT"); env=\"\$app/deploy/.runtime/$TARGET.env\""
else
  REMOTE_DIR_EXPR="d=$(printf '%q' "$DEPLOY_PATH"); d=\"\${d/#\\~/\$HOME}\"; app=\"\$d/app\"; env=\"\$d/.env\""
fi

compose_cmd() {
  local files='-f "$app/deploy/docker-compose.yml"'
  [[ -z "${DB_PUBLISH_PORT:-}" ]] || files+=' -f "$app/deploy/docker-compose.db-port.yml"'
  echo "docker compose --env-file \"\$env\" $files"
}

# File .env cho máy đích: chỉ những gì container cần, không mang thông tin SSH.
runtime_env() {
  local key value
  for key in COMPOSE_PROJECT_NAME DOMAIN APP_URL HTTP_PORT HTTPS_PORT \
    SSL_ENABLED LETSENCRYPT_EMAIL DB_IMAGE DB_NAME DB_USER DB_PASSWORD \
    DB_ROOT_PASSWORD DB_PUBLISH_PORT AUTH_SECRET AUTH_GOOGLE_ID \
    AUTH_GOOGLE_SECRET BACKEND_API_KEY NEXT_PUBLIC_CKEDITOR_LICENSE_KEY TZ; do
    # Bọc nháy đơn: cả docker compose lẫn bash đều đọc nguyên văn.
    value="${!key-}"
    printf "%s='%s'\n" "$key" "${value//\'/\'\\\'\'}"
  done
}

# ---------------------------------------------------------------- deploy
cmd_deploy() {
  if [[ "$TARGET" == "production" ]]; then
    log "Kiểm tra kết nối $SERVER_USER@$SERVER_HOST"
    remote "true" || die "Không SSH được vào máy chủ."
  fi

  log "Kiểm tra Docker trên máy đích"
  if ! remote "docker compose version >/dev/null 2>&1"; then
    if [[ "$TARGET" == "production" && "${INSTALL_DOCKER:-false}" == "true" ]]; then
      log "Cài Docker (get.docker.com)"
      remote "curl -fsSL https://get.docker.com | sh"
    else
      die "Máy đích chưa có Docker + Compose plugin. Cài Docker, hoặc đặt INSTALL_DOCKER=true (production)."
    fi
  fi

  if [[ "$TARGET" == "production" ]]; then
    # Docker vừa cài chỉ root dùng được: thêm user SSH vào nhóm docker (cần sudo
    # không mật khẩu), rồi đóng kết nối SSH dùng chung để phiên sau nhận nhóm mới.
    if ! remote "docker info >/dev/null 2>&1"; then
      log "Cấp quyền Docker cho $SERVER_USER"
      remote "sudo -n usermod -aG docker \"\$(id -un)\"" ||
        die "Không thêm được $SERVER_USER vào nhóm docker (cần sudo không mật khẩu)."
      ssh "${SSH_OPTS[@]}" -O exit "$SERVER_USER@$SERVER_HOST" 2>/dev/null || true
      remote "docker info >/dev/null 2>&1" ||
        die "$SERVER_USER vẫn chưa dùng được Docker — kiểm tra trên máy chủ: docker info"
    fi

    # DEPLOY_PATH ở nơi cần root (vd. /opt): tạo bằng sudo rồi giao cho user SSH.
    remote "$REMOTE_DIR_EXPR; mkdir -p \"\$d\" 2>/dev/null && [ -w \"\$d\" ] ||
      { sudo -n mkdir -p \"\$d\" && sudo -n chown \"\$(id -u):\$(id -g)\" \"\$d\"; }" ||
      die "Không tạo được $DEPLOY_PATH (cần sudo không mật khẩu, hoặc đổi DEPLOY_PATH sang ~/...)."
  fi

  if [[ "$IN_PLACE" == "true" ]]; then
    log "Build thẳng từ thư mục mã nguồn ($ROOT)"
  else
    log "Chép code sang máy đích ($DEPLOY_PATH)"
    # Bỏ mọi thứ build ra, dữ liệu dev và file bí mật; image được build trên máy đích.
    tar -C "$ROOT" -czf - \
      --exclude=.git --exclude=node_modules --exclude=.next --exclude=dist \
      --exclude=coverage --exclude='*.tsbuildinfo' --exclude='.env*' \
      --exclude=backend/data --exclude=deploy/env --exclude=deploy/backups \
      --exclude=deploy/.runtime --exclude=.claude \
      . | remote "$REMOTE_DIR_EXPR; mkdir -p \"\$d\" && rm -rf \"\$d/app.new\" &&
        mkdir \"\$d/app.new\" && tar -xzf - -C \"\$d/app.new\" &&
        rm -rf \"\$d/app.prev\" && { [ ! -d \"\$d/app\" ] || mv \"\$d/app\" \"\$d/app.prev\"; } &&
        mv \"\$d/app.new\" \"\$d/app\""
  fi

  log "Ghi cấu hình .env"
  runtime_env | remote "$REMOTE_DIR_EXPR; umask 077; mkdir -p \"\$(dirname \"\$env\")\" && cat > \"\$env\""

  log "Build & khởi động"
  remote "$REMOTE_DIR_EXPR; bash \"\$app/deploy/scripts/up.sh\" \"\$env\""
}

# ---------------------------------------------------------------- các lệnh khác
cmd_status() { remote "$REMOTE_DIR_EXPR; $(compose_cmd) ps"; }
cmd_logs() { remote "$REMOTE_DIR_EXPR; $(compose_cmd) logs -f --tail=200"; }
cmd_down() { remote "$REMOTE_DIR_EXPR; $(compose_cmd) --profile ssl down"; }

cmd_backup() {
  local dir="$BACKUP_DIR"
  local file
  file="$dir/$TARGET-$(date +%Y%m%d-%H%M%S).sql.gz"
  mkdir -p "$dir"
  log "Dump database $DB_NAME -> $file"
  remote "$REMOTE_DIR_EXPR; $(compose_cmd) exec -T db sh -c '
      dump=\$(command -v mariadb-dump || command -v mysqldump)
      \"\$dump\" -uroot -p\"\$MYSQL_ROOT_PASSWORD\" --single-transaction --routines \"\$MYSQL_DATABASE\"' | gzip" >"$file"
  log "Xong: $file"
}

case "$COMMAND" in
  deploy) cmd_deploy ;;
  status) cmd_status ;;
  logs) cmd_logs ;;
  down) cmd_down ;;
  backup) cmd_backup ;;
  *) usage ;;
esac
