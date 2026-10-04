"use server";

import { auth } from "@/auth";
import { BackendError } from "@/lib/backend";
import {
  PAYMENT_METHODS,
  createOrder,
  type PaymentMethod,
} from "@/lib/orders";

/** Chỉ export type: file "use server" chỉ được export hàm async. */
export type CheckoutValues = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  address: string;
  note: string;
  paymentMethod: PaymentMethod;
};

export type CheckoutState =
  | { status: "idle" }
  | {
      status: "error";
      error: string;
      values: CheckoutValues;
      /** Đổi mỗi lần gửi hỏng — form dùng làm `key` để dựng lại các ô. */
      attempt: number;
    }
  | {
      status: "placed";
      /** `null` khi request bị bẫy bot chặn — giả vờ thành công. */
      order: {
        code: string;
        total: number;
        paymentMethod: PaymentMethod;
        productIds: number[];
      } | null;
    };

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/** Giỏ gửi lên dạng JSON [{productId, quantity}]. Hỏng thì coi như trống. */
function readItems(formData: FormData): { productId: number; quantity: number }[] {
  try {
    const value: unknown = JSON.parse(text(formData, "items") || "[]");
    if (!Array.isArray(value)) return [];
    return value
      .map((line) => ({
        productId: Number((line as { productId?: unknown }).productId),
        quantity: Number((line as { quantity?: unknown }).quantity),
      }))
      .filter(
        (line) =>
          Number.isInteger(line.productId) &&
          line.productId > 0 &&
          Number.isInteger(line.quantity) &&
          line.quantity > 0,
      );
  } catch {
    return [];
  }
}

/**
 * Đặt hàng từ trang /dat-hang.
 *
 * Chỉ gửi id + số lượng; giá và tình trạng hàng backend tự đọc lại. Email
 * tài khoản lấy từ phiên đăng nhập ở server — form không có cách nào gắn đơn
 * vào tài khoản người khác.
 */
export async function placeOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const rawMethod = text(formData, "paymentMethod");
  const values: CheckoutValues = {
    customerName: text(formData, "customerName"),
    customerPhone: text(formData, "customerPhone"),
    customerEmail: text(formData, "customerEmail"),
    address: text(formData, "address"),
    note: text(formData, "note"),
    paymentMethod: (PAYMENT_METHODS as readonly string[]).includes(rawMethod)
      ? (rawMethod as PaymentMethod)
      : "cod",
  };
  const fail = (error: string): CheckoutState => ({
    status: "error",
    error,
    values,
    attempt: Date.now(),
  });

  // Bẫy bot: ô ẩn với người thật. Giả vờ thành công để bot không thử kiểu khác.
  if (text(formData, "website") !== "") return { status: "placed", order: null };

  if (!values.customerName) return fail("Vui lòng nhập họ tên người nhận.");
  if (!/^[0-9+\s().-]{8,20}$/.test(values.customerPhone)) {
    return fail("Vui lòng nhập số điện thoại hợp lệ để chúng tôi xác nhận đơn.");
  }

  const items = readItems(formData);
  if (items.length === 0) return fail("Giỏ hàng đang trống.");

  const session = await auth();

  try {
    const order = await createOrder({
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      customerEmail: values.customerEmail || null,
      address: values.address || null,
      note: values.note || null,
      paymentMethod: values.paymentMethod,
      userEmail: session?.user?.email ?? null,
      items,
    });
    return {
      status: "placed",
      order: {
        code: order.code,
        total: order.total,
        paymentMethod: order.paymentMethod,
        productIds: order.items
          .map((item) => item.productId)
          .filter((id): id is number => id !== null),
      },
    };
  } catch (error) {
    if (error instanceof BackendError) return fail(error.message);
    return fail("Không đặt được hàng lúc này. Vui lòng thử lại sau ít phút.");
  }
}
