"use client";

import { useActionState, useState } from "react";

import { Dialog } from "@/components/admin/dialog";
import { AlertIcon } from "@/components/admin/icons";
import { SubmitButton } from "@/components/submit-button";
import { BUTTON, BUTTON_SM } from "@/lib/styles";

type DeleteState = { error?: string } | null;

/**
 * Nút xoá kèm hộp thoại xác nhận.
 *
 * Dùng `Dialog` (render qua portal) thay cho `window.confirm`: hộp thoại của
 * trình duyệt không hiện được lỗi trả về từ server, mà xoá thì hay vướng ràng
 * buộc nghiệp vụ — ví dụ danh mục đang được dùng làm nhóm cho danh mục khác.
 *
 * Form nằm bên trong hộp thoại nên vẫn là form + server action bình thường,
 * không phải submit bằng JavaScript.
 */
export function DeleteButton({
  id,
  action,
  confirmText,
  label = "Xoá",
  title = "Xác nhận xoá",
  fields,
}: {
  id: string | number;
  action: (state: DeleteState, formData: FormData) => Promise<DeleteState>;
  confirmText: string;
  label?: string;
  title?: string;
  /** Trường ẩn thêm, ví dụ `categoryId` cho chi tiết danh mục. */
  fields?: Record<string, string | number>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${BUTTON.danger} ${BUTTON_SM}`}
      >
        {label}
      </button>

      {open && (
        <Dialog
          title={title}
          size="sm"
          icon={
            <AlertIcon className="size-4 shrink-0 text-red-600 dark:text-red-400" />
          }
          onClose={() => setOpen(false)}
          footer={
            <>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`${BUTTON.secondary} w-full sm:w-auto`}
              >
                Huỷ
              </button>
              <form action={formAction} className="w-full sm:w-auto">
                <input type="hidden" name="id" value={id} />
                {fields &&
                  Object.entries(fields).map(([name, value]) => (
                    <input
                      key={name}
                      type="hidden"
                      name={name}
                      value={value}
                    />
                  ))}
                <SubmitButton
                  variant="dangerSolid"
                  pendingLabel="Đang xoá…"
                  className="w-full sm:w-auto"
                >
                  {label}
                </SubmitButton>
              </form>
            </>
          }
        >
          <p className="text-sm text-admin-muted">{confirmText}</p>

          {state?.error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
            >
              {state.error}
            </p>
          )}
        </Dialog>
      )}
    </>
  );
}
