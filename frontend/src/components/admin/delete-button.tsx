"use client";

import { BUTTON } from "@/lib/styles";

/**
 * Nút xoá kèm xác nhận. Dùng form + server action nên vẫn chạy đúng luồng
 * mutation của Next; `confirm` chỉ là chốt chặn ở client.
 */
export function DeleteButton({
  id,
  action,
  confirmText,
  label = "Xoá",
}: {
  id: string;
  action: (formData: FormData) => Promise<void>;
  confirmText: string;
  label?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={`${BUTTON.danger} px-3 py-1 text-xs`}>
        {label}
      </button>
    </form>
  );
}
