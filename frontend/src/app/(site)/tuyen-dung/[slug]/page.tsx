import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  BriefcaseIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayersIcon,
  MapPinIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/admin/icons";
import { ApplyForm } from "@/components/site/apply-form";
import { JobMeta } from "@/components/site/job-meta";
import { COMPANY_NAME, COMPANY_SHORT_NAME } from "@/lib/company";
import {
  deadlineLabel,
  findJobBySlug,
  formatDay,
  listJobs,
  type Job,
} from "@/lib/recruitment";
import { applyAction } from "./actions";

/**
 * Đợt còn Nháp thì vị trí coi như chưa tồn tại với người ngoài. Đợt đã đóng
 * vẫn cho xem (link cũ được chia sẻ không chết), chỉ không nhận hồ sơ.
 */
async function loadJob(slug: string): Promise<Job | null> {
  const job = await findJobBySlug(slug);
  return job && job.batch.status !== "draft" ? job : null;
}

export async function generateMetadata(
  props: PageProps<"/tuyen-dung/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const job = await loadJob(slug);
  if (!job) return { title: "Không tìm thấy vị trí" };

  return {
    title: `Tuyển dụng: ${job.title}`,
    description:
      job.summary ??
      `${job.title} — ${job.location}. Ứng tuyển tại ${COMPANY_NAME}.`,
  };
}

export default async function JobDetailPage(
  props: PageProps<"/tuyen-dung/[slug]">,
) {
  const { slug } = await props.params;
  const job = await loadJob(slug);
  if (!job) notFound();

  const others = (await listJobs({ accepting: true, pageSize: 200 })).items
    .filter((other) => other.id !== job.id)
    .slice(0, 3);

  const overview = [
    { icon: MapPinIcon, label: "Nơi làm việc", value: job.location },
    { icon: BriefcaseIcon, label: "Hình thức", value: job.employmentType },
    { icon: LayersIcon, label: "Cấp bậc", value: job.level },
    { icon: WalletIcon, label: "Mức lương", value: job.salary ?? "Thoả thuận" },
    { icon: UsersIcon, label: "Số lượng", value: `${job.openings} người` },
    {
      icon: CalendarIcon,
      label: "Hạn nộp hồ sơ",
      value: formatDay(job.batch.endDate),
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div
          aria-hidden
          className="absolute -top-40 -right-32 size-[26rem] rounded-full bg-gold-500/10 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <nav
            aria-label="Đường dẫn"
            className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-white/50"
          >
            <Link
              href="/tuyen-dung"
              className="inline-flex items-center gap-1 transition hover:text-gold-300"
            >
              <ChevronLeftIcon className="size-3.5" />
              Tuyển dụng
            </Link>
            <span aria-hidden>/</span>
            <span className="text-white/70">{job.batch.name}</span>
          </nav>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {job.department && (
              <span className="rounded-full border border-gold-400/40 px-3 py-1 text-xs font-medium tracking-wide text-gold-300 uppercase">
                {job.department}
              </span>
            )}
            {job.accepting ? (
              <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-300">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Đang nhận hồ sơ · {deadlineLabel(job.batch.endDate)}
              </span>
            ) : (
              <span className="text-xs font-medium text-white/50">
                Đã ngừng nhận hồ sơ
              </span>
            )}
          </div>

          <h1 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {job.title}
          </h1>
          {job.summary && (
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-white/70">
              {job.summary}
            </p>
          )}

          <div className="mt-7">
            <JobMeta job={job} tone="dark" />
          </div>

          {job.accepting && (
            <a
              href="#ung-tuyen"
              className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gold-400 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-gold-300"
            >
              Ứng tuyển ngay
              <ChevronRightIcon className="size-4" />
            </a>
          )}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14 lg:px-8">
        <div className="min-w-0 space-y-12">
          {job.requirements.length > 0 && (
            <section>
              <h2 className="text-2xl font-semibold tracking-tight">
                Yêu cầu chính
              </h2>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {job.requirements.map((requirement) => (
                  <li
                    key={requirement}
                    className="flex gap-3 rounded-xl border border-black/10 bg-white p-4 text-sm leading-relaxed text-black/75"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold-100 text-[11px] font-bold text-gold-700">
                      ✓
                    </span>
                    {requirement}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-semibold tracking-tight">
              Mô tả công việc
            </h2>
            {/* HTML đã được backend lọc theo allowlist cả lúc lưu lẫn lúc đọc
                (backend/src/articles/article-content.ts). */}
            <div
              className="ck-content article-content mt-5"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </section>

          <section
            id="ung-tuyen"
            className="scroll-mt-24 overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_48px_-32px_rgb(0_0_0/0.35)]"
          >
            <div className="border-b border-black/10 bg-gold-50/70 px-6 py-6 sm:px-8">
              <h2 className="text-2xl font-semibold tracking-tight">
                Ứng tuyển vị trí này
              </h2>
              <p className="mt-1 text-sm text-black/60">
                {job.accepting
                  ? `Điền thông tin và đính kèm CV. ${COMPANY_SHORT_NAME} sẽ gửi email xác nhận ngay khi nhận được hồ sơ.`
                  : "Đợt tuyển dụng cho vị trí này đã kết thúc hoặc vị trí đã đủ người."}
              </p>
            </div>
            <div className="px-6 py-7 sm:px-8">
              {job.accepting ? (
                <ApplyForm
                  jobTitle={job.title}
                  action={applyAction.bind(null, job.id)}
                />
              ) : (
                <Link
                  href="/tuyen-dung"
                  className="inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                >
                  Xem các vị trí đang mở
                </Link>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <h2 className="text-sm font-semibold tracking-wider text-black/50 uppercase">
              Tổng quan
            </h2>
            <dl className="mt-5 space-y-4">
              {overview.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-gold-50 text-gold-700">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-black/50">{label}</dt>
                    <dd className="text-sm font-medium">{value}</dd>
                  </div>
                </div>
              ))}
            </dl>
            {job.accepting && (
              <a
                href="#ung-tuyen"
                className="mt-6 flex items-center justify-center gap-2 rounded-lg bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                Ứng tuyển ngay
                <ChevronRightIcon className="size-4" />
              </a>
            )}
          </div>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="border-t border-black/10 bg-gold-50/50">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                Vị trí khác đang tuyển
              </h2>
              <Link
                href="/tuyen-dung#vi-tri"
                className="inline-flex items-center gap-1 text-sm font-semibold text-gold-700 transition hover:text-gold-600"
              >
                Xem tất cả
                <ChevronRightIcon className="size-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {others.map((other) => (
                <Link
                  key={other.id}
                  href={`/tuyen-dung/${other.slug}`}
                  className="group flex flex-col rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-0.5 hover:border-gold-400/70 hover:shadow-lg"
                >
                  {other.department && (
                    <span className="text-xs font-medium text-black/45">
                      {other.department}
                    </span>
                  )}
                  <h3 className="mt-1 font-semibold text-balance transition group-hover:text-gold-700">
                    {other.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm text-black/55">
                    {other.location} · {other.employmentType}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                    Xem chi tiết
                    <ChevronRightIcon className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
