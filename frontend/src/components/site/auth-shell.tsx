import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_SHORT_NAME,
  COMPANY_TAGLINE,
} from "@/lib/company";

/**
 * Khung hai cột dùng chung cho /login và /register: cột trái là nhận diện
 * thương hiệu, cột phải là nội dung của từng trang.
 */
export function AuthShell({
  title,
  description,
  highlights,
  children,
  footer,
}: {
  title: string;
  description: string;
  /** Vài gạch đầu dòng ở cột trái, khác nhau giữa đăng nhập và đăng ký. */
  highlights: string[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="grid min-h-dvh flex-1 lg:grid-cols-2">
      {/* Cột trái: ẩn trên màn hình hẹp cho đỡ rối */}
      <section className="relative hidden overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute -top-32 -left-24 size-96 rounded-full bg-gold-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -right-24 -bottom-40 size-96 rounded-full bg-gold-400/5 blur-3xl"
        />

        <Link href="/" className="relative flex items-center gap-3">
          <Image
            src={COMPANY_LOGO}
            alt={`Logo ${COMPANY_NAME}`}
            width={192}
            height={192}
            priority
            className="size-11 rounded-full"
          />
          <span className="text-base font-semibold tracking-wide">
            {COMPANY_SHORT_NAME}
          </span>
        </Link>

        <div className="relative space-y-6">
          <h2 className="max-w-md text-4xl font-semibold tracking-tight text-balance">
            {COMPANY_TAGLINE}
          </h2>
          <ul className="space-y-3 text-white/70">
            {highlights.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} {COMPANY_NAME}
        </p>
      </section>

      <section className="flex items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-3 text-center">
            <Image
              src={COMPANY_LOGO}
              alt={`Logo ${COMPANY_NAME}`}
              width={192}
              height={192}
              className="mx-auto size-16 rounded-full lg:hidden"
            />
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-black/55">{description}</p>
          </div>

          {children}

          {footer}

          <p className="text-center text-sm">
            <Link
              href="/"
              className="text-black/45 underline underline-offset-4 transition hover:text-black/70"
            >
              Về trang chủ
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
