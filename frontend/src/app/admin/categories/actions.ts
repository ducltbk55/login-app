"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  createCategory,
  createCategoryDetail,
  deleteCategory,
  deleteCategoryDetail,
  updateCategory,
  updateCategoryDetail,
  type SaveCategoryDetailInput,
  type SaveCategoryInput,
} from "@/lib/categories";

export type FormState = { error?: string } | null;

/**
 * Ô select rỗng nghĩa là "không chọn" → gửi `null` để server hiểu là bỏ nhóm.
 * Trả `undefined` khi trường không có trong form (server giữ nguyên giá trị cũ).
 */
function readId(
  formData: FormData,
  field: string,
): number | null | undefined | { error: string } {
  if (!formData.has(field)) return undefined;

  const raw = String(formData.get(field) ?? "").trim();
  if (raw === "") return null;

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return { error: "Lựa chọn nhóm không hợp lệ." };
  }
  return value;
}

/** Các trường dùng chung giữa danh mục và chi tiết danh mục. */
function readCommon(formData: FormData): SaveCategoryInput | { error: string } {
  const order = String(formData.get("order") ?? "").trim();
  const parsedOrder = order === "" ? 0 : Number(order);

  if (!Number.isInteger(parsedOrder)) {
    return { error: "Thứ tự phải là số nguyên." };
  }

  // Ô `code` để trống = nhờ backend sinh từ `name`.
  return {
    code: String(formData.get("code") ?? "").trim() || undefined,
    name: String(formData.get("name") ?? "").trim(),
    descriptions: String(formData.get("descriptions") ?? "").trim() || null,
    order: parsedOrder,
    status: formData.get("status") === "on" ? "active" : "inactive",
  };
}

/**
 * Hai endpoint có DTO khác nhau và backend bật `forbidNonWhitelisted`, nên
 * mỗi form chỉ được gửi đúng trường nhóm của mình.
 */
function readCategoryForm(
  formData: FormData,
): SaveCategoryInput | { error: string } {
  const common = readCommon(formData);
  if ("error" in common) return common;

  const groupCategoryId = readId(formData, "groupCategoryId");
  if (groupCategoryId !== null && typeof groupCategoryId === "object") {
    return groupCategoryId;
  }

  return {
    ...common,
    ...(groupCategoryId === undefined ? {} : { groupCategoryId }),
  };
}

function readDetailForm(
  formData: FormData,
): SaveCategoryDetailInput | { error: string } {
  const common = readCommon(formData);
  if ("error" in common) return common;

  const groupDetailId = readId(formData, "groupDetailId");
  if (groupDetailId !== null && typeof groupDetailId === "object") {
    return groupDetailId;
  }

  return {
    ...common,
    ...(groupDetailId === undefined ? {} : { groupDetailId }),
  };
}

/** Gói lời gọi backend để lỗi nghiệp vụ hiện trên form thay vì vỡ trang. */
async function save(
  work: () => Promise<unknown>,
  redirectTo: string,
): Promise<FormState> {
  try {
    await work();
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect(redirectTo);
}

/* ---------------------------------------------------------------- danh mục */

export async function createCategoryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readCategoryForm(formData);
  if ("error" in input) return input;

  return save(() => createCategory(input), "/admin/categories");
}

export async function updateCategoryAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readCategoryForm(formData);
  if ("error" in input) return input;

  return save(() => updateCategory(id, input), "/admin/categories");
}

/** Bật/tắt nhanh từ danh sách, không cần vào trang sửa. */
export async function toggleCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "active" ? "active" : "inactive";

  await updateCategory(id, { status });
  refresh();
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireAdmin();

  await deleteCategory(String(formData.get("id") ?? ""));
  refresh();
}

/* ------------------------------------------------ chi tiết của một danh mục */

export async function createCategoryDetailAction(
  categoryId: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readDetailForm(formData);
  if ("error" in input) return input;

  return save(
    () => createCategoryDetail(categoryId, input),
    `/admin/categories/${encodeURIComponent(categoryId)}/details`,
  );
}

export async function updateCategoryDetailAction(
  categoryId: number,
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readDetailForm(formData);
  if ("error" in input) return input;

  return save(
    () => updateCategoryDetail(categoryId, id, input),
    `/admin/categories/${encodeURIComponent(categoryId)}/details`,
  );
}

export async function toggleCategoryDetailAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const categoryId = String(formData.get("categoryId") ?? "");
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "active" ? "active" : "inactive";

  await updateCategoryDetail(categoryId, id, { status });
  refresh();
}

export async function deleteCategoryDetailAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  await deleteCategoryDetail(
    String(formData.get("categoryId") ?? ""),
    String(formData.get("id") ?? ""),
  );
  refresh();
}
