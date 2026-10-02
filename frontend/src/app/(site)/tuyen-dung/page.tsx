import { COMPANY_NAME, COMPANY_PROFILE } from "@/lib/company";
import { JOBS } from "@/lib/site-content";

export const metadata = {
  title: "Tuyển dụng",
  description: `Cơ hội nghề nghiệp tại ${COMPANY_NAME}.`,
};

export default function CareersPage() {
  const totalOpenings = JOBS.reduce((n, job) => n + job.openings, 0);

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
            Hiện có <strong className="text-gold-300">{totalOpenings}</strong>{" "}
            vị trí đang mở tại văn phòng {COMPANY_PROFILE.city}.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {JOBS.map((job) => (
            <article
              key={job.slug}
              className="flex flex-col rounded-2xl border border-black/10 bg-white p-6 transition hover:border-gold-400/60 hover:shadow-lg sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-balance sm:text-xl">
                  {job.title}
                </h2>
                <span className="shrink-0 rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-800">
                  {job.openings} vị trí
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-black/10 py-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-black/50">Cấp bậc</dt>
                  <dd className="mt-0.5 font-medium">{job.level}</dd>
                </div>
                <div>
                  <dt className="text-xs text-black/50">Hình thức</dt>
                  <dd className="mt-0.5 font-medium">{job.type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-black/50">Nơi làm việc</dt>
                  <dd className="mt-0.5 font-medium">{job.location}</dd>
                </div>
                <div>
                  <dt className="text-xs text-black/50">Mức lương</dt>
                  <dd className="mt-0.5 font-medium">{job.salary}</dd>
                </div>
              </dl>

              <h3 className="mt-5 text-sm font-semibold">Yêu cầu</h3>
              <ul className="mt-2 flex-1 space-y-1.5 text-sm text-black/70">
                {job.requirements.map((requirement) => (
                  <li key={requirement} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-gold-500" />
                    {requirement}
                  </li>
                ))}
              </ul>

              <a
                href={`mailto:${COMPANY_PROFILE.email}?subject=${encodeURIComponent(
                  `Ứng tuyển: ${job.title}`,
                )}`}
                className="mt-6 inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                Ứng tuyển vị trí này
              </a>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-dashed border-black/20 p-8 text-center">
          <h2 className="text-lg font-semibold">
            Không thấy vị trí phù hợp?
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
