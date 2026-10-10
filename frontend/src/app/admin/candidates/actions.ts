"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requirePermission } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  CANDIDATE_STATUSES,
  deleteCandidate,
  findCandidate,
  updateCandidate,
  type CandidateStatus,
} from "@/lib/recruitment";

export type FormState = {
  error?: string;
  saved?: boolean;
  /** Đã yêu cầu gửi email cho ứng viên. */
  notified?: boolean;
} | null;

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

function readStatus(raw: string): CandidateStatus | undefined {
  return (CANDIDATE_STATUSES as readonly string[]).includes(raw)
    ? (raw as CandidateStatus)
    : undefined;
}

/**
 * `datetime-local` gửi "2026-10-20T14:30" không kèm múi giờ. Server Next chạy
 * theo UTC nên KHÔNG được `new Date(raw)` ở đây — gắn cứng +07:00 vì người
 * tuyển dụng luôn nhập theo giờ Việt Nam.
 */
function readInterviewAt(raw: string): string | null | { error: string } {
  if (raw === "") return null;
  const date = new Date(`${raw}:00+07:00`);
  if (Number.isNaN(date.getTime())) {
    return { error: "Lịch phỏng vấn không hợp lệ." };
  }
  return date.toISOString();
}

/**
 * Chuyển bước hồ sơ, kèm lịch phỏng vấn (khi chọn Phỏng vấn) và email báo
 * ứng viên nếu người bấm tick "Gửi email".
 *
 * Email người thao tác lấy từ phiên đăng nhập, không nhận từ form — để nhật
 * ký "ai đổi, ai gửi" không giả được.
 */
export async function changeCandidateStepAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requirePermission("CANDIDATES.WRITE");

  const status = readStatus(text(formData, "status"));
  if (!status) return { error: "Hãy chọn bước muốn chuyển tới." };

  const current = await findCandidate(id);
  if (!current) return { error: "Hồ sơ không còn tồn tại." };

  // Lịch chỉ có nghĩa ở bước Phỏng vấn; bước khác giữ nguyên lịch cũ.
  let interviewAt: string | null | undefined;
  if (status === "interview") {
    const parsed = readInterviewAt(text(formData, "interviewAt"));
    if (parsed !== null && typeof parsed === "object") return parsed;
    interviewAt = parsed;
  }

  const statusChanged = status !== current.status;
  const interviewChanged =
    interviewAt !== undefined && interviewAt !== current.interviewAt;
  if (!statusChanged && !interviewChanged) {
    return { error: "Chưa có gì thay đổi — hãy chọn bước khác hoặc đổi lịch." };
  }

  const notify = formData.get("notify") === "on" && status !== "new";

  try {
    await updateCandidate(id, {
      status,
      ...(interviewAt !== undefined ? { interviewAt } : {}),
      notify,
      message: notify ? text(formData, "message") || null : null,
      handledBy: admin.email,
    });
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return { saved: true, notified: notify };
}

/** Ghi chú nội bộ — không bao giờ gửi cho ứng viên. */
export async function saveCandidateNotesAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requirePermission("CANDIDATES.WRITE");

  try {
    await updateCandidate(id, {
      note: text(formData, "note") || null,
      handledBy: admin.email,
    });
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return { saved: true };
}

export async function deleteCandidateAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("CANDIDATES.WRITE");

  try {
    await deleteCandidate(text(formData, "id"));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}

export async function deleteCandidateAndGoBackAction(
  prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await deleteCandidateAction(prev, formData);
  if (result?.error) return result;
  redirect("/admin/candidates");
}
