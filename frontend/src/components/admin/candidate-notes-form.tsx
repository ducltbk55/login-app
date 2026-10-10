"use client";

import { useActionState } from "react";

import { AlertIcon } from "@/components/admin/icons";
import { SubmitButton } from "@/components/submit-button";
import { INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string; saved?: boolean } | null;

/**
 * Ghi chú nội bộ của người tuyển dụng. Tách khỏi form chuyển bước vì ghi chú
 * KHÔNG bao giờ gửi cho ứng viên — để hai ô cạnh nhau rất dễ nhầm.
 */
export function CandidateNotesForm({
  note,
  action,
}: {
  note: string | null;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Ghi chú nội bộ</span>
        <textarea
          name="note"
          rows={6}
          maxLength={4000}
          defaultValue={note ?? ""}
          placeholder="Nhận xét sau vòng CV, kết quả phỏng vấn, mức lương mong muốn…"
          className={`${INPUT} resize-y`}
        />
        <span className="mt-1.5 block text-xs text-admin-muted">
          Chỉ hiển thị trong trang quản trị, không gửi cho ứng viên.
        </span>
      </label>

      {state?.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}
      {state?.saved && (
        <p
          role="status"
          className="text-sm text-emerald-600 dark:text-emerald-400"
        >
          Đã lưu.
        </p>
      )}

      <SubmitButton>Lưu ghi chú</SubmitButton>
    </form>
  );
}
