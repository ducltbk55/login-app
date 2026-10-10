import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ApplyForm } from "@/components/site/apply-form";
import { COMPANY_NAME } from "@/lib/company";
import { formatDay, findJobBySlug, type Job } from "@/lib/recruitment";
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
      job.summary ?? `${job.title} — ${job.location}. Ứng tuyển tại ${COMPANY_NAME}.`,
  };
}

export default async function JobDetailPage(
  props: PageProps<"/tuyen-dung/[slug]">,
) {
  const { slug } = await props.params;
  const job = await loadJob(slug);
  if (!job) notFound();

  const facts = [
    { label: "Cấp bậc", value: job.level },
    { label: "Hình thức", value: job.employmentType },
    { label: "Nơi làm việc", value: job.location },
    { label: "Mức lương", value: job.salary ?? "Thoả thuận" },
    { label: "Số lượng", value: `${job.openings} người` },
    ...(job.department ? [{ label: "Phòng ban", value: job.department }] : []),
  ];

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <Link
            href="/tuyen-dung"
            className="text-xs font-semibold tracking-wider text-gold-300 uppercase transition hover:text-gold-200"
          >
            ← {job.batch.name}
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {job.title}
          </h1>
          {job.summary && (
            <p className="mt-5 max-w-3xl text-lg text-white/70">
              {job.summary}
            </p>
          )}
          <p className="mt-6 text-sm text-white/55">
            {job.accepting ? (
              <>
                Nhận hồ sơ đến hết ngày{" "}
                <strong className="text-white/85">
                  {formatDay(job.batch.endDate)}
                </strong>
              </>
            ) : (
              "Vị trí này hiện đã ngừng nhận hồ sơ."
            )}
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:px-8">
        <article className="min-w-0">
          <dl className="grid grid-cols-2 gap-4 rounded-2xl border border-black/10 bg-white p-6 text-sm sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="text-xs text-black/50">{fact.label}</dt>
                <dd className="mt-0.5 font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>

          {job.requirements.length > 0 && (
            <section className="mt-10">
              <h2 className="text-xl font-semibold">Yêu cầu chính</h2>
              <ul className="mt-4 space-y-2 text-black/75">
                {job.requirements.map((requirement) => (
                  <li key={requirement} className="flex gap-3">
                    <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold-500" />
                    {requirement}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-xl font-semibold">Mô tả công việc</h2>
            {/* HTML đã được backend lọc theo allowlist cả lúc lưu lẫn lúc đọc
                (backend/src/articles/article-content.ts). */}
            <div
              className="ck-content article-content mt-4"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </section>
        </article>

        <aside id="ung-tuyen" className="scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold">Ứng tuyển vị trí này</h2>
            {job.accepting ? (
              <>
                <p className="mt-1 mb-6 text-sm text-black/55">
                  Điền thông tin và đính kèm CV để nộp hồ sơ.
                </p>
                <ApplyForm
                  jobTitle={job.title}
                  action={applyAction.bind(null, job.id)}
                />
              </>
            ) : (
              <div className="mt-4 space-y-4 text-sm text-black/60">
                <p>
                  Đợt tuyển dụng cho vị trí này đã kết thúc hoặc vị trí đã đủ
                  người.
                </p>
                <Link
                  href="/tuyen-dung"
                  className="inline-flex items-center justify-center rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
                >
                  Xem các vị trí đang mở
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
