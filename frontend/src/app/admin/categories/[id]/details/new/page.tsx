import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { requirePermission } from "@/lib/admin";
import { findCategory, listAllCategoryDetails } from "@/lib/categories";
import { createCategoryDetailAction } from "../../../actions";

export default async function NewCategoryDetailPage(
  props: PageProps<"/admin/categories/[id]/details/new">,
) {
  await requirePermission("CATEGORIES.WRITE");

  const { id } = await props.params;
  const category = await findCategory(id);

  if (!category) notFound();

  // Danh mục có phân nhóm thì chi tiết phải chọn một nhóm trong danh mục cha.
  const groupCategory = category.groupCategoryId
    ? await findCategory(category.groupCategoryId)
    : null;
  const groupDetailOptions = groupCategory
    ? (
        await listAllCategoryDetails(groupCategory.id, { status: "active" })
      ).map((detail) => ({
        id: detail.id,
        code: detail.code,
        name: detail.name,
      }))
    : undefined;

  const base = `/admin/categories/${encodeURIComponent(id)}/details`;

  return (
    <div className="space-y-5">
      <BackLink href={base}>Chi tiết của {category.name}</BackLink>
      <PageHeader
        title="Thêm chi tiết"
        description={`Chi tiết mới thuộc danh mục “${category.name}”.`}
      />
      <CategoryForm
        action={createCategoryDetailAction.bind(null, category.id)}
        cancelHref={base}
        submitLabel="Tạo chi tiết"
        codeHint="Chữ, số, -, _ và dấu chấm. Chỉ cần duy nhất trong danh mục này."
        groupDetailOptions={groupDetailOptions}
        groupCategoryName={groupCategory?.name}
      />
    </div>
  );
}
