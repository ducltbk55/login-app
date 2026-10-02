"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  CONTACT_STATUSES,
  deleteContact,
  updateContact,
  type ContactStatus,
} from "@/lib/contacts";

export type FormState = { error?: string } | null;

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function readStatus(raw: string): ContactStatus | undefined {
  return (CONTACT_STATUSES as readonly string[]).includes(raw)
    ? (raw as ContactStatus)
    : undefined;
}

/**
 * Đổi trạng thái. Ghi kèm email admin đang thao tác để sau này còn biết ai
 * đã xử lý — lấy từ phiên đăng nhập chứ không nhận từ form.
 */
export async function setContactStatusAction(
  formData: FormData,
): Promise<void> {
  const admin = await requireAdmin();

  const status = readStatus(text(formData, "status"));
  if (!status) return;

  await updateContact(text(formData, "id"), { status, handledBy: admin.email });
  refresh();
}

export async function saveContactNoteAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();

  const status = readStatus(text(formData, "status"));

  try {
    await updateContact(id, {
      note: text(formData, "note") || null,
      ...(status ? { status, handledBy: admin.email } : {}),
    });
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}

export async function deleteContactAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await deleteContact(text(formData, "id"));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}

/** Xoá từ trang chi tiết thì phải quay về danh sách, không ở lại trang đã mất. */
export async function deleteContactAndGoBackAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await deleteContactAction(_prev, formData);
  if (result?.error) return result;

  redirect("/admin/contacts");
}
