"use server";

import { refresh } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  updateOrderNote,
  updateOrderPayment,
  updateOrderStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";

export type OrderActionState = { error?: string; ok?: boolean } | null;

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/** Người thực hiện ghi vào lịch sử đơn: tên kèm email cho dễ truy. */
async function actor(): Promise<string> {
  const admin = await requireAdmin();
  return admin.name ? `${admin.name} <${admin.email}>` : admin.email;
}

/** Lỗi nghiệp vụ (chuyển trạng thái sai, thiếu lý do huỷ) hiện ngay trên form. */
async function run(work: () => Promise<unknown>): Promise<OrderActionState> {
  try {
    await work();
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }
  refresh();
  return { ok: true };
}

export async function updateOrderStatusAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const by = await actor();
  const raw = text(formData, "status");
  if (!(ORDER_STATUSES as readonly string[]).includes(raw)) {
    return { error: "Trạng thái không hợp lệ." };
  }
  const status = raw as OrderStatus;
  const note = text(formData, "note") || null;
  if (status === "cancelled" && !note) {
    return { error: "Vui lòng ghi lý do huỷ đơn." };
  }

  return run(() =>
    updateOrderStatus(text(formData, "id"), { status, note, actor: by }),
  );
}

export async function updateOrderPaymentAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const by = await actor();
  const raw = text(formData, "paymentStatus");
  if (!(PAYMENT_STATUSES as readonly string[]).includes(raw)) {
    return { error: "Trạng thái thanh toán không hợp lệ." };
  }

  return run(() =>
    updateOrderPayment(text(formData, "id"), {
      paymentStatus: raw as PaymentStatus,
      note: text(formData, "note") || null,
      actor: by,
    }),
  );
}

export async function updateOrderNoteAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const by = await actor();
  return run(() =>
    updateOrderNote(text(formData, "id"), {
      adminNote: text(formData, "adminNote") || null,
      actor: by,
    }),
  );
}
