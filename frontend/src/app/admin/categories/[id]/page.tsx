import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/category-form";
import { findCategory } from "@/lib/categories";
import { updateCategoryAction } from "../actions";

export default async function EditCategoryPage(
  props: PageProps<"/admin/categories/[id]">,
) {
  const { id } = await props.params;
  const category = await findCategory(id);

  if (!category) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/admin/categories"
        className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
      >
        ← Danh sách danh mục
      </Link>
      <h2 className="text-base font-semibold">Sửa: {category.name}</h2>
      {/* bind id vào action để form chỉ cần (state, formData) */}
      <CategoryForm
        category={category}
        action={updateCategoryAction.bind(null, category.id)}
      />
    </div>
  );
}
