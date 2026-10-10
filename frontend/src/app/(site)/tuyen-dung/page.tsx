import Link from "next/link";

import {
  ChevronRightIcon,
  MailIcon,
} from "@/components/admin/icons";
import { JobBrowser, type JobGroup } from "@/components/site/job-browser";
import {
  COMPANY_NAME,
  COMPANY_PROFILE,
  COMPANY_SHORT_NAME,
  yearsInBusiness,
} from "@/lib/company";
import {
  deadlineLabel,
  formatDay,
  listJobs,
  todayInVietnam,
  type Job,
} from "@/lib/recruitment";
import { CORE_VALUES } from "@/lib/site-content";

export const metadata = {
  title: "Tuyển dụng",
  description: `Cơ hội nghề nghiệp tại ${COMPANY_NAME}. Xem các vị trí đang tuyển và nộp hồ sơ trực tuyến.`,
};

/**
 * Các bước hồ sơ đi qua — khớp đúng các trạng thái người tuyển dụng xử lý
 * trong admin, và email ứng viên nhận ở mỗi bước.
 */
const PROCESS = [
  {
    title: "Nộp hồ sơ",
    description:
      "Điền thông tin và đính kèm CV ngay trên trang vị trí. Email xác nhận được gửi tới bạn sau khi nộp.",
  },
  {
    title: "Sàng lọc",
    description:
      "Bộ phận chuyên môn xem hồ sơ và đối chiếu với yêu cầu của vị trí.",
  },
  {
    title: "Phỏng vấn",
    description:
      "Hồ sơ phù hợp nhận thư mời phỏng vấn kèm thời gian và thông tin buổi gặp.",
  },
  {
    title: "Nhận offer",
    description:
      "Ứng viên vượt qua phỏng vấn nhận thư mời làm việc với chi tiết cụ thể.",
  },
];

/** Gom vị trí theo đợt, giữ thứ tự backend trả (đợt mới trước). */
function groupByBatch(jobs: Job[], today: string): JobGroup[] {
  const groups = new Map<number, JobGroup>();
  for (const job of jobs) {
    const group = groups.get(job.batchId) ?? {
      batch: job.batch,
      deadline: deadlineLabel(job.batch.endDate, today),
      endLabel: formatDay(job.batch.endDate),
      jobs: [],
    };
    // Mô tả HTML không cần cho danh sách — bỏ đi cho nhẹ dữ liệu gửi xuống.
    group.jobs.push({ ...job, description: "" });
    groups.set(job.batchId, group);
  }
  return [...groups.values()];
}

export default async function CareersPage() {
  const jobs = (await listJobs({ accepting: true, pageSize: 200 })).items;
  const today = todayInVietnam();
  const groups = groupByBatch(jobs, today);
  const totalOpenings = jobs.reduce((n, job) => n + job.openings, 0);
  // Đợt sắp hết hạn nhất — thứ người xem cần biết để không lỡ.
  const soonest = [...groups].sort((a, b) =>
    a.batch.endDate.localeCompare(b.batch.endDate),
  )[0];

  const stats = [
    { value: jobs.length, label: "Vị trí đang tuyển" },
    { value: totalOpenings, label: "Chỗ trống" },
    { value: groups.length, label: "Đợt đang mở" },
    { value: `${yearsInBusiness()}+`, label: "Năm hoạt động" },
  ];

  return (
    <>
      {/* Hero — cùng ngôn ngữ với trang chủ: nền tối, vệt sáng vàng kim */}
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div
          aria-hidden
          className="absolute -top-40 -right-32 size-[28rem] rounded-full bg-gold-500/10 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-48 -left-32 size-[26rem] rounded-full bg-gold-400/5 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_top_left,black_30%,transparent_75%)]"
        />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-center lg:px-8 lg:py-24">
          <div className="space-y-7">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 px-3 py-1 text-xs font-medium tracking-wide text-gold-300 uppercase">
              Tuyển dụng · {COMPANY_SHORT_NAME}
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Cùng xây hệ thống, <span className="text-gold-300">không chỉ viết code</span>
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-white/70 sm:text-lg">
              Chúng tôi tìm những người muốn hiểu bài toán của khách hàng tới
              nơi tới chốn — từ khảo sát quy trình, xây dựng hệ thống cho tới
              vận hành dài hạn.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a
                href="#vi-tri"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold-400 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-gold-300"
              >
                {jobs.length > 0
                  ? `Xem ${jobs.length} vị trí đang mở`
                  : "Xem cơ hội nghề nghiệp"}
                <ChevronRightIcon className="size-4" />
              </a>
              <a
                href={`mailto:${COMPANY_PROFILE.email}?subject=${encodeURIComponent("Gửi CV ứng tuyển")}`}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <MailIcon className="size-4" />
                Gửi CV tự do
              </a>
            </div>
          </div>

          {soonest ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-300 uppercase">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Đang nhận hồ sơ
              </p>
              <p className="mt-3 text-lg font-semibold">{soonest.batch.name}</p>
              <p className="mt-1 text-sm text-white/60">
                {formatDay(soonest.batch.startDate)} –{" "}
                {formatDay(soonest.batch.endDate)}
              </p>
              <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5">
                <div>
                  <p className="text-xs text-white/50">Hạn nộp hồ sơ</p>
                  <p className="mt-0.5 text-2xl font-semibold text-gold-300">
                    {soonest.deadline}
                  </p>
                </div>
                <p className="text-right text-xs text-white/50">
                  {soonest.jobs.length} vị trí
                  <br />
                  {soonest.jobs.reduce((n, job) => n + job.openings, 0)} chỗ
                  trống
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm text-white/65">
              Hiện chưa có đợt tuyển dụng nào đang mở. Bạn vẫn có thể gửi CV
              tự do — chúng tôi sẽ liên hệ khi có vị trí phù hợp.
            </div>
          )}
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

      {/* Vị trí đang tuyển */}
      <section
        id="vi-tri"
        className="scroll-mt-20 bg-[linear-gradient(to_bottom,var(--gold-50),white_22rem)]"
      >
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-gold-600 uppercase">
              Vị trí đang tuyển
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Tìm vị trí phù hợp với bạn
            </h2>
          </div>

          <div className="mt-10">
            {groups.length > 0 ? (
              <JobBrowser groups={groups} />
            ) : (
              <div className="rounded-2xl border border-dashed border-black/20 bg-white px-6 py-16 text-center">
                <p className="text-lg font-semibold">
                  Chưa có vị trí nào đang mở
                </p>
                <p className="mx-auto mt-2 max-w-md text-sm text-black/55">
                  Các đợt tuyển dụng mới sẽ được đăng tại đây. Trong lúc chờ,
                  bạn có thể gửi CV về {COMPANY_PROFILE.email}.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quy trình tuyển dụng */}
      <section className="border-y border-black/10 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wider text-gold-600 uppercase">
              Quy trình
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Hồ sơ của bạn sẽ đi qua những bước nào
            </h2>
            <p className="mt-3 text-black/60">
              Bạn nhận email xác nhận ngay khi nộp hồ sơ; kết quả các bước sau
              được thông báo qua email hoặc điện thoại.
            </p>
          </div>

          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step, index) => (
              <li key={step.title} className="relative">
                {index < PROCESS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-5 left-12 hidden h-px w-[calc(100%-2.5rem)] bg-gradient-to-r from-gold-400/70 to-gold-200/0 lg:block"
                  />
                )}
                <span className="relative grid size-10 place-items-center rounded-full bg-ink-900 text-sm font-semibold text-gold-300 ring-4 ring-gold-100">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-5 font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-black/60">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Cách làm việc — lấy từ giá trị cốt lõi của công ty */}
      <section className="bg-gold-50/60">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:px-8">
          <div>
            <p className="text-xs font-semibold tracking-wider text-gold-600 uppercase">
              Văn hoá
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance">
              Cách chúng tôi làm việc
            </h2>
            <Link
              href="/about"
              className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-gold-700 transition hover:text-gold-600"
            >
              Tìm hiểu về {COMPANY_SHORT_NAME}
              <ChevronRightIcon className="size-4" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {CORE_VALUES.map((value) => (
              <article
                key={value.title}
                className="rounded-2xl border border-gold-200/80 bg-white p-6"
              >
                <span
                  aria-hidden
                  className="block h-1 w-10 rounded-full bg-gold-400"
                />
                <h3 className="mt-5 font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/60">
                  {value.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Gửi CV tự do */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 text-white sm:px-12">
          <div
            aria-hidden
            className="absolute -top-24 -right-16 size-72 rounded-full bg-gold-400/15 blur-3xl"
          />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Chưa thấy vị trí phù hợp?
              </h2>
              <p className="mt-2 text-white/65">
                Gửi CV về {COMPANY_PROFILE.email}, chúng tôi sẽ liên hệ khi có
                vị trí mở phù hợp với bạn.
              </p>
            </div>
            <a
              href={`mailto:${COMPANY_PROFILE.email}?subject=${encodeURIComponent("Gửi CV ứng tuyển")}`}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gold-400 px-6 py-3 text-sm font-semibold text-ink-900 transition hover:bg-gold-300"
            >
              <MailIcon className="size-4" />
              Gửi CV qua email
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
