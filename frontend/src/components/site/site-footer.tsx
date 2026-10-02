import Image from "next/image";
import Link from "next/link";

import {
  COMPANY_ADDRESS,
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_PROFILE,
  COMPANY_TAGLINE,
} from "@/lib/company";
import { NAV_ITEMS } from "@/lib/site-nav";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-ink-900 text-white/70">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <Image
              src={COMPANY_LOGO}
              alt={`Logo ${COMPANY_NAME}`}
              width={192}
              height={192}
              className="size-11 shrink-0 rounded-full"
            />
            <span>
              <span className="block text-sm font-semibold text-white">
                {COMPANY_NAME}
              </span>
              <span className="block text-xs text-gold-300">
                {COMPANY_TAGLINE}
              </span>
            </span>
          </div>
          <p className="mt-4 max-w-md text-sm">
            Thành lập năm {COMPANY_PROFILE.foundedYear} tại Đà Nẵng, chúng tôi
            xây dựng và vận hành các hệ thống {" "}
            {COMPANY_PROFILE.industry.toLowerCase()} cho doanh nghiệp.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Liên kết</h3>
          <ul className="mt-4 space-y-2 text-sm">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition hover:text-gold-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-white">Liên hệ</h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>{COMPANY_ADDRESS}</li>
            <li>
              <a
                href={`mailto:${COMPANY_PROFILE.email}`}
                className="transition hover:text-gold-300"
              >
                {COMPANY_PROFILE.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${COMPANY_PROFILE.phone.replace(/\s/g, "")}`}
                className="transition hover:text-gold-300"
              >
                {COMPANY_PROFILE.phone}
              </a>
            </li>
            <li className="text-white/50">{COMPANY_PROFILE.workingHours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {year} {COMPANY_NAME}. Bảo lưu mọi quyền.
          </p>
          <p>
            {COMPANY_PROFILE.directorTitle}: {COMPANY_PROFILE.director} · MST{" "}
            {COMPANY_PROFILE.taxCode}
          </p>
        </div>
      </div>
    </footer>
  );
}
