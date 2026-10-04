#!/bin/sh
# Sinh cấu hình từ template theo NGINX_MODE rồi chạy nginx.
# Chỉ thay ${DOMAIN}; các biến của nginx như $host giữ nguyên.
set -eu

template="/etc/nginx/site-templates/${NGINX_MODE:-http}.conf.template"
if [ ! -f "$template" ]; then
  echo "Không có template cho NGINX_MODE=${NGINX_MODE}" >&2
  exit 1
fi

envsubst '${DOMAIN}' < "$template" > /etc/nginx/conf.d/default.conf
cp /etc/nginx/site-templates/proxy.inc /etc/nginx/proxy.inc

# Nạp lại định kỳ để nhận chứng chỉ vừa gia hạn.
( while :; do sleep 6h; nginx -s reload; done ) &

exec nginx -g 'daemon off;'
