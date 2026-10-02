"use client";

import { BUTTON, BUTTON_SM } from "@/lib/styles";

/**
 * Nút xoá kèm xác nhận. Dùng form + server action nên vẫn chạy đúng luồng
 * mutation của Next; `confirm` chỉ là chốt chặn ở client.
 */
export function DeleteButton({
  id,
  action,
  confirmText,
  label = "Xoá",
  fields,
}: {
  id: string | number;
  action: (formData: FormData) => Promise<void>;
  confirmText: string;
  label?: string;
  /** Trường ẩn thêm, ví dụ `categoryId` cho chi tiết danh mục. */
  fields?: Record<string, string | number>;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {fields &&
        Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <button type="submit" className={`${BUTTON.danger} ${BUTTON_SM}`}>
        {label}
      </button>
    </form>
  );
}
