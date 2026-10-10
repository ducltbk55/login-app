import { BatchForm } from "@/components/admin/batch-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/admin";
import { createBatchAction } from "../actions";

export const metadata = { title: "Tạo đợt tuyển dụng" };

export default async function NewBatchPage() {
  await requirePermission("RECRUITMENT.WRITE");

  return (
    <div className="space-y-5">
      <BackLink href="/admin/recruitment">Danh sách đợt tuyển dụng</BackLink>
      <PageHeader
        title="Tạo đợt tuyển dụng"
        description="Để ở trạng thái Nháp trong lúc thêm vị trí, chuyển sang Đang mở khi sẵn sàng nhận hồ sơ."
      />
      <BatchForm
        action={createBatchAction}
        cancelHref="/admin/recruitment"
        submitLabel="Tạo đợt"
      />
    </div>
  );
}
