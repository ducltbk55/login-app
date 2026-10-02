"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/lib/categories";

export type FormState = { error?: string } | null;

/** Đọc form về đúng kiểu payload của backend; ô trống = "không đổi/không có". */
function readForm(formData: FormData) {
  const sortOrder = String(formData.get("sortOrder") ?? "").trim();

  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || null,
    sortOrder: sortOrder === "" ? 0 : Number(sortOrder),
    isActive: formData.get("isActive") === "on",
  };
}

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readForm(formData);
  if (Number.isNaN(input.sortOrder)) {
    return { error: "Thứ tự phải là số nguyên." };
  }

  try {
    await createCategory(input);
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect("/admin/categories");
}

export async function updateCategoryAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readForm(formData);
  if (Number.isNaN(input.sortOrder)) {
    return { error: "Thứ tự phải là số nguyên." };
  }

  try {
    await updateCategory(id, { ...input, slug: input.slug ?? undefined });
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect("/admin/categories");
}

/** Bật/tắt nhanh từ danh sách, không cần vào trang sửa. */
export async function toggleCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";

  await updateCategory(id, { isActive });
  refresh();
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();

  await deleteCategory(String(formData.get("id") ?? ""));
  refresh();
}
