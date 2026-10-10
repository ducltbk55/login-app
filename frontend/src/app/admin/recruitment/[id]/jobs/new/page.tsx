import { notFound } from "next/navigation";

import { JobForm } from "@/components/admin/job-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/admin";
import { findBatch, listBatches } from "@/lib/recruitment";
import { createJobAction } from "../../../actions";

export const metadata = { title: "Thêm vị trí tuyển dụng" };

export default async function NewJobPage(
  props: PageProps<"/admin/recruitment/[id]/jobs/new">,
) {
  await requirePermission("RECRUITMENT.WRITE");

  const { id } = await props.params;
  const [batch, batches] = await Promise.all([
    findBatch(id),
    listBatches({ pageSize: 200 }),
  ]);
  if (!batch) notFound();

  const back = `/admin/recruitment/${batch.id}`;

  return (
    <div className="space-y-5">
      <BackLink href={back}>{batch.name}</BackLink>
      <PageHeader
        title="Thêm vị trí"
        description="Vị trí hiện trên trang Tuyển dụng khi đợt đang mở và vị trí ở trạng thái Đang tuyển."
      />
      <JobForm
        batches={batches.items}
        defaultBatchId={batch.id}
        action={createJobAction}
        cancelHref={back}
        submitLabel="Thêm vị trí"
      />
    </div>
  );
}
