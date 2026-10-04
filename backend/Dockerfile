# Backend NestJS. Build trong một stage, stage chạy chỉ giữ dist + dependency production.
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/app/data/uploads
WORKDIR /app

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
# Thư mục upload là volume; tạo sẵn để volume mới nhận đúng quyền của user node.
RUN mkdir -p /app/data/uploads && chown -R node:node /app/data

USER node
EXPOSE 4000
# Schema + migration dữ liệu chạy tự động khi khởi động (DatabaseService).
CMD ["node", "dist/src/main"]
