import { CategoryForm } from "@/components/admin/category-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/admin";
import { listAllCategories } from "@/lib/categories";
import { createCategoryAction } from "../actions";

export default async function NewCategoryPage() {
  await requirePermission("CATEGORIES.WRITE");

  // Danh mục mới chưa có id nên mọi danh mục hiện có đều dùng làm nhóm được.
  const options = (await listAllCategories()).map((category) => ({
    id: category.id,
    code: category.code,
    name: category.name,
  }));

  return (
    <div className="space-y-5">
      <BackLink href="/admin/categories">Danh sách danh mục</BackLink>
      <PageHeader
        title="Thêm danh mục"
        description="Bỏ trống mã thì hệ thống tự sinh từ tên, ví dụ “Đồ gia dụng” → DO-GIA-DUNG."
      />
      <CategoryForm
        action={createCategoryAction}
        cancelHref="/admin/categories"
        submitLabel="Tạo danh mục"
        codeHint="Chữ, số, -, _ và dấu chấm. Duy nhất trong toàn hệ thống."
        groupCategoryOptions={options}
      />
    </div>
  );
}
