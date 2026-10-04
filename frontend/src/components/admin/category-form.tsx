"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  GroupCategoryField,
  toSelectOptions,
  type GroupOption,
} from "@/components/admin/group-select";
import { AlertIcon } from "@/components/admin/icons";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { SubmitButton } from "@/components/submit-button";
import type { Category } from "@/lib/categories";
import { BUTTON, CARD, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

function CardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="border-b border-admin-border px-5 py-3.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {description && (
          <p className="mt-0.5 text-xs text-admin-muted">{description}</p>
        )}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

/**
 * Công tắc bật/tắt thuần CSS. Input, rãnh và núm là ba thẻ anh em nên biến thể
 * `peer-checked:` mới chọn được — nếu lồng núm vào trong rãnh thì không ăn.
 */
function StatusToggle({ defaultOn }: { defaultOn: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-admin-border bg-admin-surface-2 p-3 transition hover:border-brand-300">
      <span>
        <span className="block text-sm font-medium">Đang hoạt động</span>
        <span className="block text-xs text-admin-muted">
          Tắt thì bản ghi vẫn còn nhưng không được dùng tới.
        </span>
      </span>
      <span className="relative inline-flex shrink-0">
        {/* Checkbox gửi lên "on"; server action đổi thành active/inactive. */}
        <input
          type="checkbox"
          name="status"
          defaultChecked={defaultOn}
          className="peer sr-only"
        />
        <span className="block h-6 w-11 rounded-full bg-admin-border transition peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40" />
        <span className="pointer-events-none absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

/**
 * Danh mục và chi tiết danh mục có cùng tập trường (code, name, descriptions,
 * order, status) nên dùng chung một form, chỉ khác nhãn và đường quay lại.
 *
 * Bố cục hai cột trải hết bề ngang: nội dung bên trái, thiết lập bên phải —
 * kéo một ô input dài 2000px thì vừa xấu vừa khó đọc.
 */
export function CategoryForm({
  record,
  action,
  cancelHref,
  submitLabel,
  codeHint,
  groupCategoryOptions,
  groupDetailOptions,
  groupCategoryName,
  readOnly = false,
}: {
  /** Có `record` là sửa, không có là thêm mới. */
  record?: Category;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  submitLabel: string;
  codeHint: string;
  /** Form danh mục: các danh mục có thể chọn làm nhóm. */
  groupCategoryOptions?: GroupOption[];
  /** Form chi tiết: các chi tiết của danh mục nhóm, bắt buộc chọn một. */
  groupDetailOptions?: GroupOption[];
  /** Tên danh mục nhóm, dùng làm nhãn cho ô chọn ở form chi tiết. */
  groupCategoryName?: string;
  /** Chỉ xem (thiếu CATEGORIES.WRITE): khoá mọi ô và ẩn nút lưu. */
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  // `record` của form chi tiết là CategoryDetail nên mới có groupDetailId.
  const groupDetailDefault =
    record && "groupDetailId" in record
      ? (record as { groupDetailId: number | null }).groupDetailId
      : null;

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={readOnly} className="min-w-0">
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <CardSection
              title="Nội dung"
              description="Thông tin hiển thị cho người dùng."
            >
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tên *</span>
                <input
                  name="name"
                  required
                  maxLength={120}
                  defaultValue={record?.name}
                  placeholder="Ví dụ: Đồ gia dụng"
                  className={`${INPUT} text-base`}
                />
              </label>

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Mô tả</span>
                <textarea
                  name="descriptions"
                  rows={8}
                  maxLength={500}
                  defaultValue={record?.descriptions ?? ""}
                  placeholder="Mô tả ngắn gọn để người khác hiểu danh mục này dùng cho việc gì."
                  className={`${INPUT} resize-y`}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Tối đa 500 ký tự.
                </span>
              </label>
            </CardSection>
          </div>

          <div className="space-y-5">
            <CardSection title="Định danh">
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Mã (code)</span>
                <input
                  name="code"
                  maxLength={60}
                  pattern="[A-Za-z0-9][A-Za-z0-9_.-]*"
                  defaultValue={record?.code}
                  placeholder="tự sinh từ tên"
                  className={`${INPUT} font-mono tracking-wide uppercase`}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  {codeHint}
                </span>
              </label>
            </CardSection>

            <CardSection title="Hiển thị">
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Thứ tự</span>
                <input
                  name="order"
                  type="number"
                  step={1}
                  defaultValue={record?.order ?? 1}
                  className={INPUT}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Số nhỏ hiện trước, đánh số từ 1.
                </span>
              </label>

              <StatusToggle
                defaultOn={(record?.status ?? "active") === "active"}
              />
            </CardSection>

            {groupCategoryOptions && (
              <CardSection
                title="Phân nhóm"
                description="Áp dụng cho chi tiết của danh mục này."
              >
                <GroupCategoryField
                  options={groupCategoryOptions}
                  defaultValue={record?.groupCategoryId ?? null}
                />
              </CardSection>
            )}

            {groupDetailOptions && (
              <CardSection
                title={`Nhóm theo ${groupCategoryName ?? "danh mục cha"}`}
              >
                <div className="block text-sm">
                  <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                    Thuộc nhóm *
                  </span>
                  <SearchableSelect
                    name="groupDetailId"
                    required
                    options={toSelectOptions(groupDetailOptions)}
                    defaultValue={
                      groupDetailDefault === null
                        ? ""
                        : String(groupDetailDefault)
                    }
                    placeholder="— Chọn nhóm —"
                    searchPlaceholder="Tìm theo tên hoặc mã…"
                    emptyLabel="Danh mục nhóm chưa có chi tiết nào"
                  />
                  {groupDetailOptions.length === 0 && (
                    <span className="mt-1.5 block text-xs text-red-600 dark:text-red-400">
                      Danh mục nhóm chưa có chi tiết nào — hãy thêm ở đó trước.
                    </span>
                  )}
                </div>
              </CardSection>
            )}
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

      {/* Thanh hành động dính đáy màn hình để không phải cuộn xuống tìm nút lưu */}
      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-admin-border bg-admin-surface/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border sm:px-4">
        <Link
          href={cancelHref}
          className={`${BUTTON.secondary} w-full sm:w-auto`}
        >
          {readOnly ? "Quay lại" : "Huỷ"}
        </Link>
        {!readOnly && (
          <SubmitButton className="w-full sm:w-auto">
            {submitLabel}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
