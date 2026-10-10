"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CardSection } from "@/components/admin/card-section";
import { AlertIcon } from "@/components/admin/icons";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { SubmitButton } from "@/components/submit-button";
import {
  BATCH_STATUS_LABELS,
  BATCH_STATUSES,
  type Batch,
} from "@/lib/recruitment";
import { BUTTON, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

export function BatchForm({
  record,
  action,
  cancelHref,
  submitLabel,
  readOnly = false,
}: {
  /** Có `record` là sửa, không có là tạo mới. */
  record?: Batch;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  submitLabel: string;
  /** Thiếu RECRUITMENT.WRITE: khoá mọi ô và ẩn nút lưu. */
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={readOnly} className="min-w-0">
        <CardSection
          title="Thông tin đợt"
          description="Trang Tuyển dụng chỉ nhận hồ sơ khi đợt Đang mở và hôm nay nằm trong khoảng ngày."
        >
          <label className="block text-sm">
            <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tên đợt *</span>
            <input
              name="name"
              required
              maxLength={200}
              defaultValue={record?.name}
              placeholder="Ví dụ: Tuyển dụng quý IV/2026"
              className={`${INPUT} text-base font-medium`}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                Ngày bắt đầu *
              </span>
              <input
                name="startDate"
                type="date"
                required
                defaultValue={record?.startDate}
                className={INPUT}
              />
            </label>
            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                Ngày kết thúc *
              </span>
              <input
                name="endDate"
                type="date"
                required
                defaultValue={record?.endDate}
                className={INPUT}
              />
            </label>
            <div className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>Trạng thái</span>
              <SearchableSelect
                name="status"
                defaultValue={record?.status ?? "draft"}
                options={BATCH_STATUSES.map((value) => ({
                  value,
                  label: BATCH_STATUS_LABELS[value],
                }))}
              />
            </div>
          </div>

          <label className="block text-sm">
            <span className={`mb-1.5 block ${LABEL_TEXT}`}>Mô tả</span>
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              defaultValue={record?.description ?? ""}
              placeholder="Mục tiêu của đợt, quy trình tuyển chọn, thời gian phản hồi…"
              className={`${INPUT} resize-y`}
            />
            <span className="mt-1.5 block text-xs text-admin-muted">
              Hiện ở đầu nhóm vị trí của đợt trên trang Tuyển dụng.
            </span>
          </label>
        </CardSection>
      </fieldset>

      {state?.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      {!readOnly && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={cancelHref}
            className={`${BUTTON.secondary} w-full sm:w-auto`}
          >
            Huỷ
          </Link>
          <SubmitButton className="w-full sm:w-auto">{submitLabel}</SubmitButton>
        </div>
      )}
    </form>
  );
}
