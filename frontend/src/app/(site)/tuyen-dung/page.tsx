import Link from "next/link";

import { COMPANY_NAME, COMPANY_PROFILE } from "@/lib/company";
import { formatDay, listJobs, type Job } from "@/lib/recruitment";

export const metadata = {
  title: "Tuyển dụng",
  description: `Cơ hội nghề nghiệp tại ${COMPANY_NAME}.`,
};

/** Gom vị trí theo đợt, giữ thứ tự backend trả (đợt mới trước). */
function groupByBatch(jobs: Job[]): { batch: Job["batch"]; jobs: Job[] }[] {
  const groups = new Map<number, { batch: Job["batch"]; jobs: Job[] }>();
  for (const job of jobs) {
    const group = groups.get(job.batchId) ?? { batch: job.batch, jobs: [] };
    group.jobs.push(job);
    groups.set(job.batchId, group);
  }
  return [...groups.values()];
}

function JobCard({ job }: { job: Job }) {
  return (
    <article className="flex flex-col rounded-2xl border border-black/10 bg-white p-6 transition hover:border-gold-400/60 hover:shadow-lg sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-balance sm:text-xl">
          <Link
            href={`/tuyen-dung/${job.slug}`}
            className="transition hover:text-gold-700"
          >
            {job.title}
          </Link>
        </h3>
        <span className="shrink-0 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-800">
          {job.openings} vị trí
        </span>
      </div>
      {job.summary && (
        <p className="mt-2 text-sm text-black/60">{job.summary}</p>
      )}

      <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-black/10 py-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-black/50">Cấp bậc</dt>
          <dd className="mt-0.5 font-medium">{job.level}</dd>
        </div>
        <div>
          <dt className="text-xs text-black/50">Hình thức</dt>
          <dd className="mt-0.5 font-medium">{job.employmentType}</dd>
        </div>
        <div>
          <dt className="text-xs text-black/50">Nơi làm việc</dt>
          <dd className="mt-0.5 font-medium">{job.location}</dd>
        </div>
        <div>
          <dt className="text-xs text-black/50">Mức lương</dt>
          <dd className="mt-0.5 font-medium">{job.salary ?? "Thoả thuận"}</dd>
        </div>
      </dl>

      {job.requirements.length > 0 && (
        <>
          <h4 className="mt-5 text-sm font-semibold">Yêu cầu</h4>
          <ul className="mt-2 space-y-1.5 text-sm text-black/70">
            {job.requirements.slice(0, 4).map((requirement) => (
              <li key={requirement} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500" />
                {requirement}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex-1" />
      <Link
        href={`/tuyen-dung/${job.slug}#ung-tuyen`}
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
      >
        Xem chi tiết & ứng tuyển
      </Link>
    </article>
  );
}

export default async function CareersPage() {
  const jobs = (await listJobs({ accepting: true, pageSize: 200 })).items;
  const totalOpenings = jobs.reduce((n, job) => n + job.openings, 0);
  const groups = groupByBatch(jobs);

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Tuyển dụng
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Cùng xây hệ thống, không chỉ viết code
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            {totalOpenings > 0 ? (
              <>
                Hiện có{" "}
                <strong className="text-gold-300">{totalOpenings}</strong> chỗ
                trống ở {jobs.length} vị trí đang nhận hồ sơ.
              </>
            ) : (
              "Hiện chưa có đợt tuyển dụng nào đang mở."
            )}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl space-y-14 px-4 py-16 sm:px-6 lg:px-8">
        {groups.map(({ batch, jobs: batchJobs }) => (
          <div key={batch.id}>
            <div className="flex flex-col gap-1 border-b border-black/10 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                {batch.name}
              </h2>
              <p className="text-sm text-black/55">
                Nhận hồ sơ đến hết ngày{" "}
                <strong className="text-black/80">
                  {formatDay(batch.endDate)}
                </strong>
              </p>
            </div>
            {batch.description && (
              <p className="mt-4 max-w-3xl text-sm whitespace-pre-line text-black/65">
                {batch.description}
              </p>
            )}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {batchJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-dashed border-black/20 p-8 text-center">
          <h2 className="text-lg font-semibold">
            {groups.length > 0
              ? "Không thấy vị trí phù hợp?"
              : "Muốn được báo khi có vị trí mới?"}
          </h2>
          <p className="mt-2 text-sm text-black/60">
            Gửi hồ sơ về{" "}
            <a
              href={`mailto:${COMPANY_PROFILE.email}`}
              className="font-semibold text-gold-700 underline underline-offset-4"
            >
              {COMPANY_PROFILE.email}
            </a>
            , chúng tôi sẽ liên hệ khi có vị trí mở.
          </p>
        </div>
      </section>
    </>
  );
}
