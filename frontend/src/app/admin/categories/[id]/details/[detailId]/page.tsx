import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import {
  findCategory,
  findCategoryDetail,
  listAllCategoryDetails,
} from "@/lib/categories";
import { CODE_CHIP } from "@/lib/styles";
import { updateCategoryDetailAction } from "../../../actions";

export default async function EditCategoryDetailPage(
  props: PageProps<"/admin/categories/[id]/details/[detailId]">,
) {
  const { id, detailId } = await props.params;
  const [category, detail] = await Promise.all([
    findCategory(id),
    findCategoryDetail(id, detailId),
  ]);

  if (!category || !detail) notFound();

  const groupCategory = category.groupCategoryId
    ? await findCategory(category.groupCategoryId)
    : null;
  const groupDetailOptions = groupCategory
    ? (await listAllCategoryDetails(groupCategory.id, { status: "active" })).map(
        (option) => ({
          id: option.id,
          code: option.code,
          name: option.name,
        }),
      )
    : undefined;

  const base = `/admin/categories/${encodeURIComponent(id)}/details`;

  return (
    <div className="space-y-5">
      <BackLink href={base}>Chi tiết của {category.name}</BackLink>
      <PageHeader
        title={`Sửa chi tiết: ${detail.name}`}
        description={
          <span className="inline-flex items-center gap-2">
            <code className={CODE_CHIP}>{detail.code}</code>
            <span>trong danh mục {category.name}</span>
          </span>
        }
      />
      <CategoryForm
        record={detail}
        action={updateCategoryDetailAction.bind(null, category.id, detail.id)}
        cancelHref={base}
        submitLabel="Lưu thay đổi"
        codeHint="Chữ, số, -, _ và dấu chấm. Chỉ cần duy nhất trong danh mục này."
        groupDetailOptions={groupDetailOptions}
        groupCategoryName={groupCategory?.name}
      />
    </div>
  );
}
