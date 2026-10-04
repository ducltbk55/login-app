"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  updateOrderNoteAction,
  updateOrderPaymentAction,
  updateOrderStatusAction,
  type OrderActionState,
} from "@/app/admin/orders/actions";
import { AlertIcon } from "@/components/admin/icons";
import {
  ORDER_ACTION_LABELS,
  ORDER_TRANSITIONS,
  PAYMENT_ACTION_LABELS,
  PAYMENT_TRANSITIONS,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { BUTTON, INPUT } from "@/lib/styles";

function ErrorText({ state }: { state: OrderActionState }) {
  if (!state?.error) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
    >
      <AlertIcon className="mt-0.5 size-4 shrink-0" />
      {state.error}
    </p>
  );
}

function Submit({
  children,
  tone = "primary",
}: {
  children: React.ReactNode;
  tone?: "primary" | "secondary" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${BUTTON[tone]} disabled:opacity-60`}
    >
      {pending ? "Đang lưu…" : children}
    </button>
  );
}

/**
 * Chọn bước tiếp theo, (tuỳ chọn) ghi chú, rồi xác nhận. Hai bước để không
 * lỡ tay: bấm nhầm "Huỷ đơn" trên đơn đang giao là phiền.
 */
function TransitionForm<T extends string>({
  orderId,
  field,
  options,
  labels,
  action,
  requireNoteFor,
  emptyText,
}: {
  orderId: number;
  field: "status" | "paymentStatus";
  options: T[];
  labels: Record<T, string>;
  action: (
    state: OrderActionState,
    formData: FormData,
  ) => Promise<OrderActionState>;
  /** Bước bắt buộc ghi lý do (huỷ đơn). */
  requireNoteFor?: T;
  emptyText: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [chosen, setChosen] = useState<T | null>(null);

  if (options.length === 0) {
    return <p className="text-sm text-admin-muted">{emptyText}</p>;
  }

  const needsNote = chosen !== null && chosen === requireNoteFor;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      {chosen && <input type="hidden" name={field} value={chosen} />}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setChosen(chosen === option ? null : option)}
            aria-pressed={chosen === option}
            className={`${
              option === requireNoteFor ? BUTTON.danger : BUTTON.secondary
            } ${chosen === option ? "ring-2 ring-brand-400 ring-offset-1" : ""}`}
          >
            {labels[option]}
          </button>
        ))}
      </div>

      {chosen && (
        <div className="space-y-3 rounded-lg border border-admin-border bg-admin-surface-2 p-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-xs font-medium text-admin-muted">
              {needsNote
                ? "Lý do huỷ *"
                : "Ghi chú (tuỳ chọn) — lưu vào lịch sử"}
            </span>
            <textarea
              name="note"
              rows={2}
              maxLength={1000}
              required={needsNote}
              placeholder={
                needsNote ? "Ví dụ: Khách đổi ý, không liên lạc được…" : ""
              }
              className={`${INPUT} resize-y`}
            />
          </label>
          <div className="flex gap-2">
            <Submit tone={needsNote ? "danger" : "primary"}>
              Xác nhận: {labels[chosen]}
            </Submit>
            <button
              type="button"
              onClick={() => setChosen(null)}
              className={BUTTON.secondary}
            >
              Thôi
            </button>
          </div>
        </div>
      )}

      <ErrorText state={state} />
    </form>
  );
}

export function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: number;
  status: OrderStatus;
}) {
  return (
    // key: lưu xong trạng thái đổi → dựng lại form, bỏ lựa chọn cũ. Lưu hỏng
    // thì giữ nguyên để admin sửa lý do rồi gửi lại.
    <TransitionForm
      key={status}
      orderId={orderId}
      field="status"
      options={ORDER_TRANSITIONS[status]}
      labels={ORDER_ACTION_LABELS}
      action={updateOrderStatusAction}
      requireNoteFor="cancelled"
      emptyText="Đơn đã kết thúc, không còn bước xử lý nào."
    />
  );
}

export function OrderPaymentActions({
  orderId,
  paymentStatus,
}: {
  orderId: number;
  paymentStatus: PaymentStatus;
}) {
  return (
    <TransitionForm
      key={paymentStatus}
      orderId={orderId}
      field="paymentStatus"
      options={PAYMENT_TRANSITIONS[paymentStatus]}
      labels={PAYMENT_ACTION_LABELS}
      action={updateOrderPaymentAction}
      emptyText="Đã hoàn tiền — không còn thao tác thanh toán."
    />
  );
}

export function OrderNoteForm({
  orderId,
  adminNote,
}: {
  orderId: number;
  adminNote: string | null;
}) {
  const [state, formAction] = useActionState(updateOrderNoteAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={orderId} />
      <textarea
        name="adminNote"
        rows={4}
        maxLength={2000}
        defaultValue={adminNote ?? ""}
        placeholder="Chỉ nội bộ thấy. Ví dụ: khách hẹn gọi lại sau 15h."
        className={`${INPUT} resize-y`}
      />
      <div className="flex items-center gap-3">
        <Submit tone="secondary">Lưu ghi chú</Submit>
        {state?.ok && <span className="text-xs text-emerald-600">Đã lưu.</span>}
      </div>
      <ErrorText state={state} />
    </form>
  );
}
