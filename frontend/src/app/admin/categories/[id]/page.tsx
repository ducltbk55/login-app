import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { ListIcon } from "@/components/admin/icons";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { findCategory, listAllCategories } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import { BUTTON, CODE_CHIP } from "@/lib/styles";
import { updateCategoryAction } from "../actions";

export default async function EditCategoryPage(
  props: PageProps<"/admin/categories/[id]">,
) {
  const { id } = await props.params;
  const category = await findCategory(id);

  if (!category) notFound();

  // Loại chính nó và các danh mục đang lấy nó làm nhóm, tránh tạo vòng.
  const all = await listAllCategories();
  const groupCategoryOptions = all
    .filter((c) => c.id !== category.id && c.groupCategoryId !== category.id)
    .map((c) => ({ id: c.id, code: c.code, name: c.name }));

  return (
    <div className="space-y-5">
      <BackLink href="/admin/categories">Danh sách danh mục</BackLink>

      <PageHeader
        title={`Sửa: ${category.name}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <code className={CODE_CHIP}>{category.code}</code>
            <span>
              Tạo lúc {formatDateTime(category.createdAt)} · Cập nhật{" "}
              {formatDateTime(category.updatedAt)}
            </span>
          </span>
        }
        action={
          <Link
            href={`/admin/categories/${encodeURIComponent(id)}/details`}
            className={`${BUTTON.secondary} w-full sm:w-auto`}
          >
            <ListIcon className="size-4" />
            Chi tiết danh mục
          </Link>
        }
      />

      {/* bind id vào action để form chỉ cần (state, formData) */}
      <CategoryForm
        record={category}
        action={updateCategoryAction.bind(null, category.id)}
        cancelHref="/admin/categories"
        submitLabel="Lưu thay đổi"
        codeHint="Chữ, số, -, _ và dấu chấm. Duy nhất trong toàn hệ thống."
        groupCategoryOptions={groupCategoryOptions}
      />
    </div>
  );
}
