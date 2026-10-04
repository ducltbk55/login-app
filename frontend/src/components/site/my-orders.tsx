import Link from "next/link";

import { BankTransferInfo } from "@/components/site/bank-transfer-info";
import { formatDateTime, formatVnd } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_SHORT,
  PAYMENT_STATUS_LABELS,
  type Order,
  type OrderStatus,
} from "@/lib/orders";

/** Màu trạng thái cho trang ngoài (nền sáng, tông vàng của site). */
const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  confirmed: "bg-sky-50 text-sky-800 ring-sky-200",
  shipping: "bg-indigo-50 text-indigo-800 ring-indigo-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  cancelled: "bg-red-50 text-red-700 ring-red-200",
};

/** Bước tiến của đơn, để khách biết đơn đang ở đâu trong quy trình. */
const STEPS: OrderStatus[] = ["pending", "confirmed", "shipping", "completed"];

function Progress({ status }: { status: OrderStatus }) {
  if (status === "cancelled") return null;
  const current = STEPS.indexOf(status);
  return (
    <ol className="mt-4 grid grid-cols-4 gap-1 text-[0.6875rem] text-black/50">
      {STEPS.map((step, index) => (
        <li key={step}>
          <span
            className={`block h-1.5 rounded-full ${
              index <= current ? "bg-gold-500" : "bg-black/10"
            }`}
          />
          <span
            className={`mt-1 block ${index === current ? "font-semibold text-black/80" : ""}`}
          >
            {ORDER_STATUS_LABELS[step]}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Đơn hàng của thành viên trên trang cá nhân. Bấm vào một đơn để xem chi
 * tiết dòng hàng — dùng <details> nên không cần JavaScript.
 */
export function MyOrders({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <p className="text-sm text-black/55">
        Bạn chưa có đơn hàng nào.{" "}
        <Link
          href="/san-pham"
          className="font-medium text-gold-700 underline underline-offset-4"
        >
          Xem sản phẩm
        </Link>
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <details className="group rounded-xl border border-black/10 open:bg-gold-50/40">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
              <span>
                <span className="font-mono text-sm font-semibold">
                  {order.code}
                </span>
                <span className="ml-2 text-xs text-black/50">
                  {formatDateTime(order.createdAt)}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums">
                  {formatVnd(order.total)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[order.status]}`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </span>
                <span className="text-black/40 transition group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>

            <div className="border-t border-black/10 px-4 py-4 text-sm">
              <ul className="space-y-1.5">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span>
                      {item.productSlug && item.productId !== null ? (
                        <Link
                          href={`/san-pham/${item.productSlug}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {item.productName}
                        </Link>
                      ) : (
                        item.productName
                      )}{" "}
                      <span className="text-black/50">× {item.quantity}</span>
                    </span>
                    <span className="tabular-nums">
                      {formatVnd(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-black/55">
                {PAYMENT_METHOD_SHORT[order.paymentMethod]} ·{" "}
                {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                {order.address && ` · Giao tới: ${order.address}`}
              </p>
              <Progress status={order.status} />
              {order.paymentMethod === "bank_transfer" &&
                order.paymentStatus === "unpaid" &&
                order.status !== "cancelled" && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold">
                      Thông tin chuyển khoản
                    </p>
                    <BankTransferInfo
                      orderCode={order.code}
                      amount={order.total}
                    />
                  </div>
                )}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
