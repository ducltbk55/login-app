import Link from "next/link";

import { CategoryForm } from "@/components/admin/category-form";
import { createCategoryAction } from "../actions";

export default function NewCategoryPage() {
  return (
    <div className="space-y-5">
      <Link
        href="/admin/categories"
        className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
      >
        ← Danh sách danh mục
      </Link>
      <h2 className="text-base font-semibold">Thêm danh mục</h2>
      <CategoryForm action={createCategoryAction} />
    </div>
  );
}
