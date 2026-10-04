import { request, requestOptional, segment } from "./backend";
import type { BadgeTone } from "@/components/badge";

import type { Paginated, PageQuery } from "./categories";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipping",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  shipping: "Đang giao",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

export const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  pending: "warning",
  confirmed: "info",
  shipping: "info",
  completed: "success",
  cancelled: "danger",
};

/** Khớp ORDER_TRANSITIONS của backend — để chỉ hiện nút hợp lệ. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "completed", "cancelled"],
  shipping: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Nhãn nút hành động: nói việc sẽ làm, không phải tên trạng thái đích. */
export const ORDER_ACTION_LABELS: Record<OrderStatus, string> = {
  pending: "Về chờ xác nhận",
  confirmed: "Xác nhận đơn",
  shipping: "Bắt đầu giao",
  completed: "Hoàn thành",
  cancelled: "Huỷ đơn",
};

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Chưa thanh toán",
  paid: "Đã thanh toán",
  refunded: "Đã hoàn tiền",
};

export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ["paid"],
  paid: ["unpaid", "refunded"],
  refunded: [],
};

export const PAYMENT_ACTION_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Đánh dấu chưa thu",
  paid: "Xác nhận đã thu tiền",
  refunded: "Đã hoàn tiền",
};

export const PAYMENT_METHODS = ["cod", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: "Thanh toán khi nhận hàng / nghiệm thu (COD)",
  bank_transfer: "Chuyển khoản ngân hàng",
};

export const PAYMENT_METHOD_SHORT: Record<PaymentMethod, string> = {
  cod: "COD",
  bank_transfer: "Chuyển khoản",
};

export type OrderItem = {
  id: number;
  productId: number | null;
  productName: string;
  productSlug: string | null;
  sku: string | null;
  image: string | null;
  listPrice: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderEvent = {
  id: number;
  type: "created" | "status" | "payment" | "note";
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  actor: string | null;
  createdAt: string;
};

export type Order = {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string | null;
  note: string | null;
  userEmail: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  total: number;
  itemCount: number;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

export type OrderDetail = Order & { events: OrderEvent[] };

export type OrderStats = {
  total: number;
  byStatus: Record<OrderStatus, number>;
  revenue: number;
  today: number;
};

export type CreateOrderInput = {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string | null;
  note: string | null;
  paymentMethod: PaymentMethod;
  /** Từ phiên đăng nhập, không bao giờ từ form. */
  userEmail: string | null;
  items: { productId: number; quantity: number }[];
};

export type OrderQuery = PageQuery & {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  userEmail?: string;
};

export async function listOrders(
  query: OrderQuery = {},
): Promise<Paginated<Order>> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return request<Paginated<Order>>(
    `/orders${params.size > 0 ? `?${params}` : ""}`,
  );
}

export async function findOrder(
  id: string | number,
): Promise<OrderDetail | null> {
  return requestOptional<OrderDetail>(`/orders/${segment(id)}`);
}

export async function orderStats(): Promise<OrderStats> {
  return request<OrderStats>("/orders/stats");
}

export async function createOrder(
  input: CreateOrderInput,
): Promise<OrderDetail> {
  return request<OrderDetail>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateOrderStatus(
  id: string | number,
  input: { status: OrderStatus; note?: string | null; actor?: string | null },
): Promise<OrderDetail> {
  return request<OrderDetail>(`/orders/${segment(id)}/status`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateOrderPayment(
  id: string | number,
  input: {
    paymentStatus: PaymentStatus;
    note?: string | null;
    actor?: string | null;
  },
): Promise<OrderDetail> {
  return request<OrderDetail>(`/orders/${segment(id)}/payment`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function updateOrderNote(
  id: string | number,
  input: { adminNote: string | null; actor?: string | null },
): Promise<OrderDetail> {
  return request<OrderDetail>(`/orders/${segment(id)}/note`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
