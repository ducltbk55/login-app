import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image Docker build ở dạng standalone (xem frontend/Dockerfile). Chỉ bật khi
  // được yêu cầu, vì `next start` lúc dev không chạy với output standalone.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  // frontend là một package độc lập; nếu không chỉ định, Turbopack sẽ suy ra
  // thư mục gốc của monorepo (nơi cũng có package-lock.json) và cảnh báo.
  turbopack: { root: import.meta.dirname },
  images: {
    // Ảnh đại diện Google được phục vụ từ domain này.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
