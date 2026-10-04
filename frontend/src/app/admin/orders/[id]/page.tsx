import Link from "next/link";
import { notFound } from "next/navigation";

import { BoxIcon } from "@/components/admin/icons";
import {
  OrderNoteForm,
  OrderPaymentActions,
  OrderStatusActions,
} from "@/components/admin/order-actions";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/badge";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatDateTime, formatVnd } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  findOrder,
  type OrderEvent,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { CARD } from "@/lib/styles";

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-3 border-b border-admin-border px-5 py-3.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-admin-muted">{label}</dt>
      <dd className="mt-0.5 text-sm break-words">{children}</dd>
    </div>
  );
}

/** Một dòng lịch sử thành câu đọc được. */
function describe(event: OrderEvent): string {
  const status = (value: string | null) =>
    value ? (ORDER_STATUS_LABELS[value as OrderStatus] ?? value) : "—";
  const payment = (value: string | null) =>
    value ? (PAYMENT_STATUS_LABELS[value as PaymentStatus] ?? value) : "—";

  switch (event.type) {
    case "created":
      return "Khách đặt hàng";
    case "status":
      return `Trạng thái: ${status(event.fromValue)} → ${status(event.toValue)}`;
    case "payment":
      return `Thanh toán: ${payment(event.fromValue)} → ${payment(event.toValue)}`;
    case "note":
      return "Cập nhật ghi chú nội bộ";
  }
}

export default async function AdminOrderPage(
  props: PageProps<"/admin/orders/[id]">,
) {
  const { id } = await props.params;
  const [order, user] = await Promise.all([findOrder(id), currentUser()]);
  if (!order) notFound();

  // Layout chỉ đòi ORDERS.READ — chỉ hiện form người xem dùng được.
  const canWrite = can(user!, "ORDERS.WRITE");
  const canPayment = can(user!, "ORDERS.PAYMENT");

  const paymentTone =
    order.paymentStatus === "paid"
      ? "success"
      : order.paymentStatus === "refunded"
        ? "danger"
        : "warning";

  return (
    <div className="space-y-5">
      <BackLink href="/admin/orders">Danh sách đơn hàng</BackLink>

      <PageHeader
        title={`Đơn ${order.code}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>Đặt lúc {formatDateTime(order.createdAt)}</span>
            <Badge tone={ORDER_STATUS_TONES[order.status]}>
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <Badge tone={paymentTone}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus]}
            </Badge>
          </span>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section title={`Sản phẩm (${order.itemCount})`}>
            <ul className="divide-y divide-admin-border">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                >
                  {item.image ? (
                    // URL tuỳ ý (có thể là link ngoài) nên dùng img thường.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="size-12 shrink-0 rounded-lg border border-admin-border object-cover"
                    />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-admin-border bg-admin-surface-2 text-admin-muted">
                      <BoxIcon className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1 text-sm">
                    {item.productId !== null ? (
                      <Link
                        href={`/admin/products/${item.productId}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {item.productName}
                      </Link>
                    ) : (
                      <span className="font-medium">
                        {item.productName}{" "}
                        <span className="text-xs font-normal text-admin-muted">
                          (sản phẩm đã xoá)
                        </span>
                      </span>
                    )}
                    <p className="text-xs text-admin-muted tabular-nums">
                      {item.sku && `${item.sku} · `}
                      {formatVnd(item.unitPrice)}
                      {item.unitPrice < item.listPrice && (
                        <s className="ml-1">{formatVnd(item.listPrice)}</s>
                      )}{" "}
                      × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">
                    {formatVnd(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-admin-border pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-admin-muted">Tạm tính (giá niêm yết)</dt>
                <dd className="tabular-nums">{formatVnd(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <dt>Khuyến mãi</dt>
                  <dd className="tabular-nums">−{formatVnd(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold">
                <dt>Khách phải trả</dt>
                <dd className="tabular-nums">{formatVnd(order.total)}</dd>
              </div>
            </dl>
          </Section>

          <Section title="Lịch sử xử lý">
            <ol className="relative space-y-4 border-l border-admin-border pl-5">
              {[...order.events].reverse().map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-500 ring-4 ring-admin-surface" />
                  <p className="text-sm font-medium">{describe(event)}</p>
                  {event.note && (
                    <p className="mt-0.5 text-sm whitespace-pre-line text-admin-muted">
                      “{event.note}”
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-admin-muted">
                    {formatDateTime(event.createdAt)}
                    {event.actor && ` · ${event.actor}`}
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="space-y-5">
          {canWrite && (
            <Section title="Xử lý đơn">
              <OrderStatusActions orderId={order.id} status={order.status} />
            </Section>
          )}

          <Section title="Thanh toán">
            <p className={`${canPayment ? "mb-3 " : ""}text-sm`}>
              {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            </p>
            {canPayment && (
              <OrderPaymentActions
                orderId={order.id}
                paymentStatus={order.paymentStatus}
              />
            )}
          </Section>

          <Section title="Khách hàng">
            <dl className="space-y-3">
              <Info label="Họ tên">{order.customerName}</Info>
              <Info label="Điện thoại">
                <a
                  href={`tel:${order.customerPhone.replace(/[^\d+]/g, "")}`}
                  className="text-brand-600 hover:underline"
                >
                  {order.customerPhone}
                </a>
              </Info>
              {order.customerEmail && (
                <Info label="Email">
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="text-brand-600 hover:underline"
                  >
                    {order.customerEmail}
                  </a>
                </Info>
              )}
              <Info label="Địa chỉ">{order.address ?? "—"}</Info>
              {order.note && (
                <Info label="Ghi chú của khách">
                  <span className="whitespace-pre-line">{order.note}</span>
                </Info>
              )}
              <Info label="Tài khoản">
                {order.userEmail ? (
                  <Link
                    href={`/admin/users/${encodeURIComponent(order.userEmail)}`}
                    className="text-brand-600 hover:underline"
                  >
                    {order.userEmail}
                  </Link>
                ) : (
                  <span className="text-admin-muted">Khách vãng lai</span>
                )}
              </Info>
            </dl>
          </Section>

          {canWrite ? (
            <Section title="Ghi chú nội bộ">
              <OrderNoteForm orderId={order.id} adminNote={order.adminNote} />
            </Section>
          ) : (
            order.adminNote && (
              <Section title="Ghi chú nội bộ">
                <p className="text-sm whitespace-pre-line">{order.adminNote}</p>
              </Section>
            )
          )}
        </div>
      </div>
    </div>
  );
}
