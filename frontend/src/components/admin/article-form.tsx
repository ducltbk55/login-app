"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { CardSection } from "@/components/admin/card-section";
import { CoverImageField } from "@/components/admin/cover-image-field";
import { AlertIcon } from "@/components/admin/icons";
import { RichTextEditor } from "@/components/admin/lazy-rich-text-editor";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { SubmitButton } from "@/components/submit-button";
import {
  ARTICLE_STATUS_LABELS,
  type Article,
  type ArticleCategory,
  type ArticleStatus,
} from "@/lib/articles";
import { BUTTON, CHECKBOX, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

/**
 * `datetime-local` cần đúng định dạng "YYYY-MM-DDTHH:mm" theo giờ địa phương.
 * Cắt chuỗi ISO sẽ ra giờ UTC và lệch múi giờ, nên phải dựng lại từ các thành
 * phần local của Date.
 */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function ArticleForm({
  record,
  categories,
  defaultAuthor,
  action,
  cancelHref,
  submitLabel,
}: {
  /** Có `record` là sửa, không có là thêm mới. */
  record?: Article;
  categories: ArticleCategory[];
  /** Tên admin đang đăng nhập, điền sẵn cho bài mới. */
  defaultAuthor?: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, null);
  // Ô ngày chỉ có nghĩa với bài đã/sẽ xuất bản, nên theo dõi trạng thái để
  // đổi phần chú thích bên dưới cho khớp.
  const [status, setStatus] = useState<ArticleStatus>(record?.status ?? "draft");

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <CardSection
            title="Nội dung bài viết"
            description="Phần hiển thị cho bạn đọc ở trang Tin tức."
          >
            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tiêu đề *</span>
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={record?.title}
                placeholder="Ví dụ: UY VŨ ICT ra mắt hệ thống quản trị danh mục"
                className={`${INPUT} text-base font-medium`}
              />
            </label>

            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                Tóm tắt (sapo)
              </span>
              <textarea
                name="summary"
                rows={3}
                maxLength={500}
                defaultValue={record?.summary ?? ""}
                placeholder="Hai ba câu tóm ý chính, hiện ở danh sách tin và khi chia sẻ link."
                className={`${INPUT} resize-y`}
              />
              <span className="mt-1.5 block text-xs text-admin-muted">
                Tối đa 500 ký tự. Bỏ trống thì danh sách lấy tạm đoạn đầu của
                nội dung.
              </span>
            </label>

            {/* Không bọc trong <label>: bấm vào thanh công cụ sẽ bị label
                chuyển focus đi chỗ khác. */}
            <div className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>Nội dung *</span>
              <RichTextEditor
                name="content"
                defaultValue={record?.content}
                uploadUrl="/admin/articles/images"
              />
            </div>
          </CardSection>
        </div>

        <div className="space-y-5">
          <CardSection title="Phân loại">
            <div className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>Chuyên mục *</span>
              <SearchableSelect
                name="categoryDetailId"
                required
                options={categories.map((category) => ({
                  value: String(category.id),
                  label: category.name,
                }))}
                defaultValue={
                  record?.categoryDetailId === undefined
                    ? ""
                    : String(record.categoryDetailId)
                }
                placeholder="— Chọn chuyên mục —"
                searchPlaceholder="Tìm chuyên mục…"
                emptyLabel="Chưa có chuyên mục nào đang bật"
              />
              {categories.length === 0 && (
                <span className="mt-1.5 block text-xs text-red-600 dark:text-red-400">
                  Chưa có chuyên mục nào đang bật. Hãy bật hoặc thêm trong Danh
                  mục → Danh mục chuyên mục.
                </span>
              )}
            </div>

            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tác giả *</span>
              <input
                name="author"
                required
                maxLength={120}
                defaultValue={record?.author ?? defaultAuthor ?? ""}
                placeholder="Tên người viết"
                className={INPUT}
              />
            </label>
          </CardSection>

          <CardSection title="Xuất bản">
            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>Trạng thái</span>
              <SearchableSelect
                name="status"
                defaultValue={status}
                onChange={(value) => setStatus(value as ArticleStatus)}
                options={(
                  Object.keys(ARTICLE_STATUS_LABELS) as ArticleStatus[]
                ).map((value) => ({
                  value,
                  label: ARTICLE_STATUS_LABELS[value],
                }))}
              />
            </label>

            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                Ngày xuất bản
              </span>
              <input
                name="publishedAt"
                type="datetime-local"
                defaultValue={toLocalInput(record?.publishedAt ?? null)}
                className={INPUT}
              />
              <span className="mt-1.5 block text-xs text-admin-muted">
                {status === "published"
                  ? "Để trống là đăng ngay. Chọn ngày ở tương lai để hẹn giờ — bài chỉ hiện ở trang ngoài khi tới giờ."
                  : "Chỉ có tác dụng khi trạng thái là Đã xuất bản."}
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-admin-border bg-admin-surface-2 p-3 transition hover:border-brand-300">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={record?.featured ?? false}
                className={`${CHECKBOX} mt-0.5`}
              />
              <span>
                <span className="block text-sm font-medium">Bài nổi bật</span>
                <span className="block text-xs text-admin-muted">
                  Đẩy lên đầu trang Tin tức, hiển thị ở khối lớn.
                </span>
              </span>
            </label>
          </CardSection>

          <CardSection title="Hiển thị">
            <CoverImageField
              defaultValue={record?.coverImage}
              uploadUrl="/admin/articles/images"
            />

            <label className="block text-sm">
              <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                Đường dẫn (slug)
              </span>
              <input
                name="slug"
                maxLength={160}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                defaultValue={record?.slug ?? ""}
                placeholder="tự sinh từ tiêu đề"
                className={`${INPUT} font-mono text-xs`}
              />
              <span className="mt-1.5 block text-xs text-admin-muted">
                Địa chỉ bài: /tin-tuc/&lt;slug&gt;. Đổi slug sẽ làm hỏng link đã
                chia sẻ trước đó.
              </span>
            </label>
          </CardSection>
        </div>
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

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-admin-border bg-admin-surface/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border sm:px-4">
        <Link
          href={cancelHref}
          className={`${BUTTON.secondary} w-full sm:w-auto`}
        >
          Huỷ
        </Link>
        <SubmitButton className="w-full sm:w-auto">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
