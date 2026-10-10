import Link from "next/link";
import { notFound } from "next/navigation";

import { ExternalIcon, IdCardIcon } from "@/components/admin/icons";
import { JobForm } from "@/components/admin/job-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { JobStatusBadge } from "@/components/admin/recruitment-status";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { findJob, listBatches } from "@/lib/recruitment";
import { BUTTON } from "@/lib/styles";
import { updateJobAction } from "../../../actions";

export default async function EditJobPage(
  props: PageProps<"/admin/recruitment/[id]/jobs/[jobId]">,
) {
  const { jobId } = await props.params;
  const [job, batches, user] = await Promise.all([
    findJob(jobId),
    listBatches({ pageSize: 200 }),
    currentUser(),
  ]);
  if (!job) notFound();

  const canWrite = can(user!, "RECRUITMENT.WRITE");
  // Luôn quay về đợt hiện tại của vị trí, kể cả khi URL mang id đợt khác.
  const back = `/admin/recruitment/${job.batchId}`;

  return (
    <div className="space-y-5">
      <BackLink href={back}>{job.batch.name}</BackLink>

      <PageHeader
        title={canWrite ? `Sửa: ${job.title}` : job.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>{job.candidateCount} hồ sơ</span>
            <span>· Cập nhật {formatDateTime(job.updatedAt)}</span>
          </span>
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <JobStatusBadge job={job} />
            {can(user!, "CANDIDATES.READ") && (
              <Link
                href={`/admin/candidates?jobId=${job.id}`}
                className={BUTTON.secondary}
              >
                <IdCardIcon className="size-4" />
                Ứng viên
              </Link>
            )}
            {job.accepting && (
              <Link
                href={`/tuyen-dung/${job.slug}`}
                target="_blank"
                className={BUTTON.secondary}
              >
                <ExternalIcon className="size-4" />
                Xem trên trang
              </Link>
            )}
          </div>
        }
      />

      <JobForm
        record={job}
        batches={batches.items}
        action={updateJobAction.bind(null, job.id)}
        cancelHref={back}
        submitLabel="Lưu thay đổi"
        readOnly={!canWrite}
      />
    </div>
  );
}
