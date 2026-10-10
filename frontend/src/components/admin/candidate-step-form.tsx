"use client";

import { useActionState, useState } from "react";

import { AlertIcon, MailIcon } from "@/components/admin/icons";
import { SubmitButton } from "@/components/submit-button";
import {
  CANDIDATE_EMAIL_LABELS,
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_STATUSES,
  type CandidateStatus,
} from "@/lib/recruitment";
import { CHECKBOX, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string; saved?: boolean; notified?: boolean } | null;

/**
 * ISO → giá trị cho `datetime-local` theo GIỜ VIỆT NAM (không theo múi giờ
 * máy người xem), khớp với cách server đọc lại (gắn +07:00).
 */
function toVietnamInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Gợi ý nội dung lời nhắn theo bước — đúng thứ ứng viên cần biết ở bước đó. */
const MESSAGE_HINTS: Partial<Record<CandidateStatus, string>> = {
  screening: "Ví dụ: thời gian dự kiến có kết quả sàng lọc…",
  interview:
    "Địa điểm hoặc link họp online, người phỏng vấn, giấy tờ cần mang theo…",
  offered: "Mức lương, ngày bắt đầu, hạn phản hồi lời mời…",
  hired: "Ngày giờ nhận việc, nơi gặp, giấy tờ cần chuẩn bị…",
  rejected: "Lời nhắn riêng (không bắt buộc)…",
};

/**
 * Chuyển bước hồ sơ + gửi email cho ứng viên.
 *
 * Một form thay cho các nút bấm-là-xong trước đây: email ra ngoài không thu
 * hồi được, nên người bấm phải thấy rõ sẽ gửi thư gì trước khi lưu, và tự
 * quyết có gửi hay không.
 */
export function CandidateStepForm({
  current,
  interviewAt,
  action,
}: {
  current: CandidateStatus;
  interviewAt: string | null;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, null);
  // Mặc định chọn bước kế tiếp — việc hay làm nhất.
  const nextIndex = Math.min(
    CANDIDATE_STATUSES.indexOf(current) + 1,
    CANDIDATE_STATUSES.length - 2,
  );
  const [status, setStatus] = useState<CandidateStatus>(
    current === "hired" || current === "rejected"
      ? current
      : CANDIDATE_STATUSES[nextIndex],
  );
  const [notify, setNotify] = useState(true);

  // Đưa về "Mới nộp" thì không có email nào để gửi.
  const canNotify = status !== "new";
  const rescheduling = status === "interview" && current === "interview";
  const emailLabel = rescheduling
    ? "Cập nhật lịch phỏng vấn"
    : CANDIDATE_EMAIL_LABELS[status];

  return (
    <form action={formAction} className="space-y-4">
      <fieldset>
        <legend className={`mb-2 block text-sm ${LABEL_TEXT}`}>
          Chuyển sang bước
        </legend>
        <div className="flex flex-wrap gap-2">
          {CANDIDATE_STATUSES.map((value) => {
            const checked = status === value;
            const danger = value === "rejected";
            return (
              <label
                key={value}
                className={`cursor-pointer rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                  checked
                    ? danger
                      ? "border-red-500 bg-red-500/10 text-red-700 dark:text-red-300"
                      : "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                    : "border-admin-border hover:border-brand-300"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={value}
                  checked={checked}
                  onChange={() => setStatus(value)}
                  className="sr-only"
                />
                {CANDIDATE_STATUS_LABELS[value]}
                {value === current && (
                  <span className="ml-1 text-admin-muted">(hiện tại)</span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      {status === "interview" && (
        <label className="block text-sm">
          <span className={`mb-1.5 block ${LABEL_TEXT}`}>
            Lịch phỏng vấn (giờ Việt Nam)
          </span>
          <input
            name="interviewAt"
            type="datetime-local"
            defaultValue={toVietnamInput(interviewAt)}
            className={INPUT}
          />
          <span className="mt-1.5 block text-xs text-admin-muted">
            Bỏ trống nếu chưa chốt giờ — email sẽ báo bộ phận tuyển dụng sẽ
            liên hệ để hẹn.
          </span>
        </label>
      )}

      <div className="rounded-lg border border-admin-border bg-admin-surface-2 p-3">
        <label
          className={`flex items-start gap-3 ${canNotify ? "cursor-pointer" : "opacity-60"}`}
        >
          <input
            type="checkbox"
            name="notify"
            checked={canNotify && notify}
            disabled={!canNotify}
            onChange={(event) => setNotify(event.target.checked)}
            className={`${CHECKBOX} mt-0.5`}
          />
          <span className="text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <MailIcon className="size-4" />
              Gửi email cho ứng viên
            </span>
            <span className="block text-xs text-admin-muted">
              {canNotify
                ? `Mẫu: “${emailLabel}”.`
                : "Đưa hồ sơ về bước Mới nộp không gửi email."}
            </span>
          </span>
        </label>

        {canNotify && notify && (
          <label className="mt-3 block text-sm">
            <span className={`mb-1.5 block ${LABEL_TEXT}`}>
              Lời nhắn kèm email
            </span>
            <textarea
              name="message"
              rows={4}
              maxLength={2000}
              placeholder={MESSAGE_HINTS[status]}
              className={`${INPUT} resize-y`}
            />
            <span className="mt-1.5 block text-xs text-admin-muted">
              Ứng viên ĐỌC ĐƯỢC nội dung này. Ghi chú nội bộ nhập ở ô bên dưới.
            </span>
          </label>
        )}
      </div>

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
          {state.notified
            ? "Đã lưu. Email đang được gửi — kết quả hiện trong Lịch sử hồ sơ."
            : "Đã lưu, không gửi email."}
        </p>
      )}

      <SubmitButton>
        {canNotify && notify ? "Lưu & gửi email" : "Lưu"}
      </SubmitButton>
    </form>
  );
}
