import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { COMPANY_NAME } from "@/lib/company";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // `template` để trang con chỉ cần đặt tiêu đề riêng, tên công ty tự nối vào.
  title: {
    default: COMPANY_NAME,
    template: `%s · ${COMPANY_NAME}`,
  },
  description:
    `Hệ thống quản trị tài khoản và danh mục của ${COMPANY_NAME}.`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
