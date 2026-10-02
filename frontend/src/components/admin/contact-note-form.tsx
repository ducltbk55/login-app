"use client";

import { useActionState } from "react";

import { AlertIcon } from "@/components/admin/icons";
import { SubmitButton } from "@/components/submit-button";
import { INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

/**
 * Ghi chú nội bộ của admin về một liên hệ.
 *
 * Tách khỏi nút đổi trạng thái vì hai việc khác nhịp: trạng thái bấm một cái
 * là xong, còn ghi chú cần gõ rồi mới lưu.
 */
export function ContactNoteForm({
  defaultNote,
  action,
}: {
  defaultNote: string | null;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-3">
      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Ghi chú nội bộ</span>
        <textarea
          name="note"
          rows={5}
          maxLength={2000}
          defaultValue={defaultNote ?? ""}
          placeholder="Đã gọi lại lúc 14h, khách hẹn gửi thêm tài liệu…"
          className={`${INPUT} resize-y`}
        />
        <span className="mt-1.5 block text-xs text-admin-muted">
          Chỉ hiển thị trong trang quản trị, không gửi cho người liên hệ.
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

      <SubmitButton>Lưu ghi chú</SubmitButton>
    </form>
  );
}
