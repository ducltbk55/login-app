import Link from "next/link";
import { notFound } from "next/navigation";

import { BatchForm } from "@/components/admin/batch-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import {
  BriefcaseIcon,
  ExternalIcon,
  IdCardIcon,
  PencilIcon,
} from "@/components/admin/icons";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import {
  BatchStatusBadge,
  JobStatusBadge,
} from "@/components/admin/recruitment-status";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { findBatch, listJobs, type Job } from "@/lib/recruitment";
import {
  BUTTON,
  BUTTON_SM,
  CARD,
  ICON_BUTTON,
  ROW_CARD,
  TABLE,
} from "@/lib/styles";
import {
  deleteBatchAndGoBackAction,
  deleteJobAction,
  setJobStatusAction,
  updateBatchAction,
} from "../actions";

function JobQuickStatus({ job }: { job: Job }) {
  const next = job.status === "open" ? "closed" : "open";
  return (
    <form action={setJobStatusAction}>
      <input type="hidden" name="id" value={job.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        className={`${BUTTON.secondary} ${BUTTON_SM} whitespace-nowrap`}
      >
        {next === "open" ? "Mở lại" : "Tạm dừng"}
      </button>
    </form>
  );
}

export default async function BatchDetailPage(
  props: PageProps<"/admin/recruitment/[id]">,
) {
  const { id } = await props.params;
  const [batch, user] = await Promise.all([findBatch(id), currentUser()]);
  if (!batch) notFound();

  const jobs = (await listJobs({ batchId: batch.id, pageSize: 200 })).items;
  const canWrite = can(user!, "RECRUITMENT.WRITE");
  const canSeeCandidates = can(user!, "CANDIDATES.READ");

  const jobHref = (job: Job) => `/admin/recruitment/${batch.id}/jobs/${job.id}`;
  const deleteText = (job: Job) =>
    `Xoá vị trí "${job.title}"? Chỉ xoá được vị trí chưa có hồ sơ nào.`;

  return (
    <div className="space-y-5">
      <BackLink href="/admin/recruitment">Danh sách đợt tuyển dụng</BackLink>

      <PageHeader
        title={batch.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>{batch.jobCount} vị trí</span>
            <span>· {batch.candidateCount} hồ sơ</span>
            <span>· Cập nhật {formatDateTime(batch.updatedAt)}</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <BatchStatusBadge batch={batch} />
            {canSeeCandidates && (
              <Link
                href={`/admin/candidates?batchId=${batch.id}`}
                className={BUTTON.secondary}
              >
                <IdCardIcon className="size-4" />
                Ứng viên của đợt
              </Link>
            )}
          </div>
        }
      />

      <section className={CARD}>
        <div className="flex flex-col gap-3 border-b border-admin-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Vị trí trong đợt</h3>
            <p className="mt-0.5 text-xs text-admin-muted">
              Vị trí Đang tuyển chỉ nhận hồ sơ khi đợt đang mở.
            </p>
          </div>
          {canWrite && (
            <Link
              href={`/admin/recruitment/${batch.id}/jobs/new`}
              className={`${BUTTON.primary} w-full sm:w-auto`}
            >
              Thêm vị trí
            </Link>
          )}
        </div>

        {jobs.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon className="size-6" />}
            title="Đợt này chưa có vị trí nào"
            description="Thêm vị trí cần tuyển để chúng hiện trên trang Tuyển dụng."
          />
        ) : (
          <>
            <ul className="grid gap-3 p-4 md:hidden">
              {jobs.map((job) => (
                <li key={job.id} className={ROW_CARD}>
                  <div className="flex items-start justify-between gap-3">
                    <Link href={jobHref(job)} className="min-w-0 font-medium">
                      {job.title}
                    </Link>
                    <JobStatusBadge job={job} />
                  </div>
                  <p className="text-xs text-admin-muted">
                    {job.level} · {job.employmentType} · {job.location}
                  </p>
                  <p className="text-sm text-admin-muted">
                    Cần {job.openings} · {job.candidateCount} hồ sơ
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={jobHref(job)}
                      className={`${BUTTON.secondary} ${BUTTON_SM}`}
                    >
                      <PencilIcon className="size-3.5" />
                      {canWrite ? "Sửa" : "Xem"}
                    </Link>
                    {canWrite && <JobQuickStatus job={job} />}
                    {canWrite && (
                      <DeleteButton
                        id={job.id}
                        action={deleteJobAction}
                        confirmText={deleteText(job)}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="admin-scroll hidden overflow-x-auto md:block">
              <table className={TABLE.table}>
                <thead className={TABLE.thead}>
                  <tr>
                    <th className={TABLE.th}>Vị trí</th>
                    <th className={TABLE.th}>Điều kiện</th>
                    <th className={`${TABLE.th} text-right`}>Cần tuyển</th>
                    <th className={`${TABLE.th} text-right`}>Hồ sơ</th>
                    <th className={TABLE.th}>Trạng thái</th>
                    <th className={TABLE.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className={TABLE.tr}>
                      <td className={`${TABLE.td} max-w-xs`}>
                        <Link
                          href={jobHref(job)}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {job.title}
                        </Link>
                        {job.department && (
                          <span className="block text-xs text-admin-muted">
                            {job.department}
                          </span>
                        )}
                      </td>
                      <td className={`${TABLE.td} text-xs text-admin-muted`}>
                        {job.level} · {job.employmentType}
                        <span className="block">
                          {job.location}
                          {job.salary ? ` · ${job.salary}` : ""}
                        </span>
                      </td>
                      <td className={`${TABLE.td} text-right tabular-nums`}>
                        {job.openings}
                      </td>
                      <td className={`${TABLE.td} text-right tabular-nums`}>
                        {canSeeCandidates && job.candidateCount > 0 ? (
                          <Link
                            href={`/admin/candidates?jobId=${job.id}`}
                            className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
                          >
                            {job.candidateCount}
                          </Link>
                        ) : (
                          job.candidateCount
                        )}
                      </td>
                      <td className={`${TABLE.td} whitespace-nowrap`}>
                        <JobStatusBadge job={job} />
                      </td>
                      <td className={TABLE.td}>
                        <div className="flex items-center justify-end gap-2">
                          {canWrite && <JobQuickStatus job={job} />}
                          {job.accepting && (
                            <Link
                              href={`/tuyen-dung/${job.slug}`}
                              target="_blank"
                              title="Xem trên trang"
                              aria-label="Xem trên trang"
                              className={ICON_BUTTON}
                            >
                              <ExternalIcon className="size-4" />
                            </Link>
                          )}
                          <Link
                            href={jobHref(job)}
                            title={canWrite ? "Sửa" : "Xem"}
                            aria-label={canWrite ? "Sửa" : "Xem"}
                            className={ICON_BUTTON}
                          >
                            <PencilIcon className="size-4" />
                          </Link>
                          {canWrite && (
                            <DeleteButton
                              id={job.id}
                              action={deleteJobAction}
                              confirmText={deleteText(job)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <BatchForm
        record={batch}
        action={updateBatchAction.bind(null, batch.id)}
        cancelHref="/admin/recruitment"
        submitLabel="Lưu thông tin đợt"
        readOnly={!canWrite}
      />

      {canWrite && (
        <section className={`${CARD} space-y-3 p-5`}>
          <h3 className="text-sm font-semibold">Xoá đợt</h3>
          <p className="text-sm text-admin-muted">
            Chỉ xoá được đợt chưa có vị trí nào. Đợt đã có hồ sơ nên chuyển
            sang Đã đóng để giữ lại lịch sử ứng tuyển.
          </p>
          <DeleteButton
            id={batch.id}
            action={deleteBatchAndGoBackAction}
            confirmText={`Xoá đợt "${batch.name}"?`}
          />
        </section>
      )}
    </div>
  );
}
