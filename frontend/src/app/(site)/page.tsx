import Image from "next/image";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/admin/icons";
import {
  COMPANY_ADDRESS,
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_PROFILE,
  COMPANY_SHORT_NAME,
  COMPANY_TAGLINE,
  yearsInBusiness,
} from "@/lib/company";
import { ArticleCard } from "@/components/site/article-card";
import { listArticles } from "@/lib/articles";
import { listJobs } from "@/lib/recruitment";
import { SERVICES } from "@/lib/site-content";

export const metadata = {
  title: "Trang chủ",
  description: `${COMPANY_NAME} — ${COMPANY_TAGLINE}.`,
};

export default async function HomePage() {
  // Ba bài mới nhất đang lên sóng; trang vẫn dựng được nếu chưa có bài nào.
  const [latestNews, openJobs] = await Promise.all([
    listArticles({ live: true, pageSize: 3 }).then((page) => page.items),
    listJobs({ accepting: true, pageSize: 200 }).then((page) => page.items),
  ]);

  const stats = [
    { value: `${COMPANY_PROFILE.foundedYear}`, label: "Năm thành lập" },
    { value: `${yearsInBusiness()}+`, label: "Năm kinh nghiệm" },
    { value: `${SERVICES.length}`, label: "Nhóm dịch vụ" },
    {
      value: `${openJobs.reduce((n, job) => n + job.openings, 0)}`,
      label: "Vị trí đang tuyển",
    },
  ];

  return (
    <>
      {/* Hero: nền tối cho logo vàng nổi bật, nối liền với thanh điều hướng */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div
          aria-hidden
          className="absolute -top-40 -right-32 size-[28rem] rounded-full bg-gold-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-48 -left-32 size-[26rem] rounded-full bg-gold-400/5 blur-3xl"
        />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 px-3 py-1 text-xs font-medium tracking-wide text-gold-300 uppercase">
              {COMPANY_PROFILE.industry}
            </span>

            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {COMPANY_TAGLINE}
            </h1>

            <p className="max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              {COMPANY_NAME} đồng hành cùng doanh nghiệp từ khâu khảo sát quy
              trình, xây dựng hệ thống cho tới vận hành và bảo trì dài hạn.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-gold-300"
              >
                Trở thành thành viên
                <ChevronRightIcon className="size-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Tìm hiểu về chúng tôi
              </Link>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-0 scale-110 rounded-full bg-gold-400/20 blur-2xl"
              />
              <Image
                src={COMPANY_LOGO}
                alt={`Logo ${COMPANY_NAME}`}
                width={192}
                height={192}
                priority
                className="relative size-52 rounded-full sm:size-64 lg:size-80"
              />
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/10">
          <dl className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-px bg-white/10 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-ink-900 px-2 py-6 text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-3xl font-semibold text-gold-300 tabular-nums">
                    {stat.value}
                  </span>
                  <span className="mt-1 block text-xs text-white/60">
                    {stat.label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Mời tham gia thành viên */}
      <section className="border-b border-gold-200/70 bg-gold-50/60">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Trở thành thành viên của {COMPANY_SHORT_NAME}
            </h2>
            <p className="mt-2 text-black/60">
              Đăng nhập bằng Google, bổ sung vài thông tin liên hệ là xong. Sau
              đó bạn theo dõi được yêu cầu và hồ sơ của mình ở một nơi.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Trở thành thành viên
            <ChevronRightIcon className="size-4" />
          </Link>
        </div>
      </section>

      {/* Dịch vụ */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-gold-600 uppercase">
            Dịch vụ
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Chúng tôi làm gì cho doanh nghiệp của bạn
          </h2>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <article
              key={service.slug}
              className="flex flex-col rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-lg"
            >
              <h3 className="text-base font-semibold">{service.title}</h3>
              <p className="mt-2 flex-1 text-sm text-black/60">
                {service.summary}
              </p>
              <ul className="mt-4 space-y-1.5 border-t border-black/10 pt-4 text-sm text-black/70">
                {service.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Tin tức mới nhất */}
      <section className="bg-gold-50/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wider text-gold-600 uppercase">
                Tin tức
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Cập nhật mới nhất
              </h2>
            </div>
            <Link
              href="/tin-tuc"
              className="inline-flex items-center gap-1 text-sm font-semibold text-gold-700 transition hover:text-gold-600"
            >
              Xem tất cả
              <ChevronRightIcon className="size-4" />
            </Link>
          </div>

          {latestNews.length > 0 ? (
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {latestNews.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="mt-10 rounded-2xl border border-dashed border-black/15 px-6 py-12 text-center text-sm text-black/50">
              Chưa có bài viết nào được đăng.
            </p>
          )}
        </div>
      </section>

      {/* Liên hệ */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-white sm:px-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                Bắt đầu một dự án cùng chúng tôi
              </h2>
              <p className="max-w-lg text-white/70">
                Gửi cho chúng tôi vài dòng về bài toán của bạn. Đội ngũ sẽ phản
                hồi trong giờ làm việc.
              </p>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <a
                  href={`mailto:${COMPANY_PROFILE.email}`}
                  className="inline-flex items-center justify-center rounded-lg bg-gold-400 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-gold-300"
                >
                  {COMPANY_PROFILE.email}
                </a>
                <a
                  href={`tel:${COMPANY_PROFILE.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  {COMPANY_PROFILE.phone}
                </a>
              </div>
            </div>

            <dl className="space-y-5 text-sm">
              <div>
                <dt className="text-gold-300">Văn phòng</dt>
                <dd className="mt-1 text-white/80">{COMPANY_ADDRESS}</dd>
              </div>
              <div>
                <dt className="text-gold-300">Giờ làm việc</dt>
                <dd className="mt-1 text-white/80">
                  {COMPANY_PROFILE.workingHours}
                </dd>
              </div>
              <div>
                <dt className="text-gold-300">
                  {COMPANY_PROFILE.directorTitle}
                </dt>
                <dd className="mt-1 text-white/80">
                  {COMPANY_PROFILE.director}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
