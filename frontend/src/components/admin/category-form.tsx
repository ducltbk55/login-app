"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { Category } from "@/lib/categories";
import { BUTTON, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

export function CategoryForm({
  category,
  action,
}: {
  /** Có `category` là sửa, không có là thêm mới. */
  category?: Category;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="max-w-lg space-y-4">
      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tên danh mục *</span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={category?.name}
          placeholder="Ví dụ: Đồ gia dụng"
          className={INPUT}
        />
      </label>

      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Slug</span>
        <input
          name="slug"
          maxLength={140}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={category?.slug}
          placeholder="bỏ trống để tự sinh từ tên"
          className={INPUT}
        />
        <span className="mt-1 block text-xs opacity-60">
          Chỉ chữ thường, số và dấu gạch ngang. Tiếng Việt sẽ được bỏ dấu.
        </span>
      </label>

      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Mô tả</span>
        <textarea
          name="description"
          rows={3}
          maxLength={500}
          defaultValue={category?.description ?? ""}
          className={INPUT}
        />
      </label>

      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Thứ tự hiển thị</span>
        <input
          name="sortOrder"
          type="number"
          step={1}
          defaultValue={category?.sortOrder ?? 0}
          className={`${INPUT} sm:w-32`}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={category?.isActive ?? true}
          className="size-4 accent-blue-600"
        />
        <span className={LABEL_TEXT}>Đang hoạt động</span>
      </label>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>{category ? "Lưu thay đổi" : "Tạo danh mục"}</SubmitButton>
        <Link href="/admin/categories" className={BUTTON.secondary}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}
