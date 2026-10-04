# Frontend Next.js, build dạng standalone (server.js tự chứa, không cần node_modules đầy đủ).
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Biến NEXT_PUBLIC_* được nhúng vào bundle lúc build nên phải có ở đây.
ARG NEXT_PUBLIC_CKEDITOR_LICENSE_KEY=""
ENV NEXT_PUBLIC_CKEDITOR_LICENSE_KEY=$NEXT_PUBLIC_CKEDITOR_LICENSE_KEY \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
