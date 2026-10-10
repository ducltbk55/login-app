"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CardSection } from "@/components/admin/card-section";
import { AlertIcon } from "@/components/admin/icons";
import { RichTextEditor } from "@/components/admin/lazy-rich-text-editor";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { SubmitButton } from "@/components/submit-button";
import {
  BATCH_STATUS_LABELS,
  EMPLOYMENT_TYPE_OPTIONS,
  JOB_STATUS_LABELS,
  JOB_STATUSES,
  LEVEL_OPTIONS,
  type Batch,
  type Job,
} from "@/lib/recruitment";
import { BUTTON, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

/** Ô chữ tự do kèm gợi ý sẵn — đa số chọn, số ít cần gõ giá trị riêng. */
function SuggestInput({
  name,
  label,
  options,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  options: string[];
  defaultValue?: string;
  placeholder: string;
}) {
  const listId = `${name}-options`;
  return (
    <label className="block text-sm">
      <span className={`mb-1.5 block ${LABEL_TEXT}`}>{label}</span>
      <input
        name={name}
        list={listId}
        required
        maxLength={60}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={INPUT}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </label>
  );
}

export function JobForm({
  record,
  batches,
  defaultBatchId,
  action,
  cancelHref,
  submitLabel,
  readOnly = false,
}: {
  record?: Job;
  /** Đợt chọn được; vị trí có thể chuyển sang đợt khác. */
  batches: Pick<Batch, "id" | "name" | "status">[];
  defaultBatchId?: number;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  submitLabel: string;
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={readOnly} className="min-w-0">
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <CardSection
              title="Mô tả vị trí"
              description="Phần ứng viên đọc ở trang chi tiết vị trí."
            >
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Chức danh *
                </span>
                <input
                  name="title"
                  required
                  maxLength={200}
                  defaultValue={record?.title}
                  placeholder="Ví dụ: Lập trình viên Backend (NestJS)"
                  className={`${INPUT} text-base font-medium`}
                />
              </label>

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tóm tắt</span>
                <textarea
                  name="summary"
                  rows={2}
                  maxLength={500}
                  defaultValue={record?.summary ?? ""}
                  placeholder="Một hai câu về vai trò, hiện ở danh sách vị trí."
                  className={`${INPUT} resize-y`}
                />
              </label>

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Yêu cầu chính
                </span>
                <textarea
                  name="requirements"
                  rows={5}
                  maxLength={3000}
                  defaultValue={record?.requirements.join("\n") ?? ""}
                  placeholder={
                    "Mỗi dòng một yêu cầu, ví dụ:\n2 năm kinh nghiệm TypeScript\nHiểu cơ sở dữ liệu quan hệ"
                  }
                  className={`${INPUT} resize-y`}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Mỗi dòng một ý, hiện dạng gạch đầu dòng trên thẻ vị trí.
                </span>
              </label>

              {/* Không bọc trong <label>: bấm thanh công cụ sẽ bị label
                  chuyển focus đi chỗ khác. */}
              <div className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Mô tả công việc *
                </span>
                <RichTextEditor
                  name="description"
                  defaultValue={record?.description}
                  uploadUrl="/admin/recruitment/images"
                  disabled={readOnly}
                />
              </div>
            </CardSection>
          </div>

          <div className="space-y-5">
            <CardSection title="Đợt & trạng thái">
              <div className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Đợt tuyển dụng *
                </span>
                <SearchableSelect
                  name="batchId"
                  required
                  defaultValue={String(record?.batchId ?? defaultBatchId ?? "")}
                  options={batches.map((batch) => ({
                    value: String(batch.id),
                    label: batch.name,
                    hint: BATCH_STATUS_LABELS[batch.status],
                  }))}
                  placeholder="— Chọn đợt —"
                  searchPlaceholder="Tìm đợt…"
                  emptyLabel="Chưa có đợt tuyển dụng nào"
                />
              </div>

              <div className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Trạng thái</span>
                <SearchableSelect
                  name="status"
                  defaultValue={record?.status ?? "open"}
                  options={JOB_STATUSES.map((value) => ({
                    value,
                    label: JOB_STATUS_LABELS[value],
                  }))}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Tạm dừng khi đã đủ người, không cần đóng cả đợt.
                </span>
              </div>
            </CardSection>

            <CardSection title="Điều kiện làm việc">
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Phòng ban</span>
                <input
                  name="department"
                  maxLength={120}
                  defaultValue={record?.department ?? ""}
                  placeholder="Khối Kỹ thuật"
                  className={INPUT}
                />
              </label>

              <SuggestInput
                name="level"
                label="Cấp bậc *"
                options={LEVEL_OPTIONS}
                defaultValue={record?.level}
                placeholder="Middle"
              />
              <SuggestInput
                name="employmentType"
                label="Hình thức *"
                options={EMPLOYMENT_TYPE_OPTIONS}
                defaultValue={record?.employmentType}
                placeholder="Toàn thời gian"
              />

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Nơi làm việc *
                </span>
                <input
                  name="location"
                  required
                  maxLength={120}
                  defaultValue={record?.location}
                  placeholder="Đà Nẵng"
                  className={INPUT}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                    Mức lương
                  </span>
                  <input
                    name="salary"
                    maxLength={120}
                    defaultValue={record?.salary ?? ""}
                    placeholder="Thoả thuận"
                    className={INPUT}
                  />
                </label>
                <label className="block text-sm">
                  <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                    Số lượng *
                  </span>
                  <input
                    name="openings"
                    type="number"
                    required
                    min={1}
                    max={999}
                    defaultValue={record?.openings ?? 1}
                    className={INPUT}
                  />
                </label>
              </div>
            </CardSection>

            <CardSection title="Hiển thị">
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Đường dẫn (slug)
                </span>
                <input
                  name="slug"
                  maxLength={160}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  defaultValue={record?.slug ?? ""}
                  placeholder="tự sinh từ chức danh"
                  className={`${INPUT} font-mono text-xs`}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Địa chỉ: /tuyen-dung/&lt;slug&gt;.
                </span>
              </label>
            </CardSection>
          </div>
        </div>
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

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-admin-border bg-admin-surface/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border sm:px-4">
        <Link
          href={cancelHref}
          className={`${BUTTON.secondary} w-full sm:w-auto`}
        >
          {readOnly ? "Quay lại" : "Huỷ"}
        </Link>
        {!readOnly && (
          <SubmitButton className="w-full sm:w-auto">{submitLabel}</SubmitButton>
        )}
      </div>
    </form>
  );
}
