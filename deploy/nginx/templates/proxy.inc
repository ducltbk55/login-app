# Chuyển tiếp tới frontend Next.js. $http_host giữ cả cổng (vd. localhost:8080):
# server action và route upload ảnh so Origin với Host, thiếu cổng là bị chặn.
proxy_pass http://frontend:3000;
proxy_http_version 1.1;
proxy_set_header Host $http_host;
proxy_set_header X-Forwarded-Host $http_host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 60s;
