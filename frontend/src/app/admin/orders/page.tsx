import Link from "next/link";

import { EmptyState } from "@/components/admin/empty-state";
import { ReceiptIcon } from "@/components/admin/icons";
import { Field, FilterBar, PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { Badge } from "@/components/badge";
import { formatDateTime, formatVnd } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  ORDER_STATUSES,
  PAYMENT_METHOD_SHORT,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  listOrders,
  orderStats,
  type Order,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { BUTTON, CARD, INPUT, ROW_CARD, TABLE } from "@/lib/styles";

export const metadata = { title: "Đơn hàng" };

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function PaymentBadge({ order }: { order: Order }) {
  const tone =
    order.paymentStatus === "paid"
      ? "success"
      : order.paymentStatus === "refunded"
        ? "danger"
        : "neutral";
  return <Badge tone={tone}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</Badge>;
}

/** "Phần mềm A + 2 sản phẩm khác" — đủ nhận ra đơn mà không chiếm chỗ. */
function itemsSummary(order: Order): string {
  const [first, ...rest] = order.items;
  if (!first) return "—";
  return rest.length > 0
    ? `${first.productName} + ${rest.length} sản phẩm khác`
    : first.productName;
}

export default async function AdminOrdersPage(
  props: PageProps<"/admin/orders">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const rawStatus = pickOne(params.status) ?? "";
  const status = (ORDER_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as OrderStatus)
    : undefined;
  const rawPayment = pickOne(params.paymentStatus) ?? "";
  const paymentStatus = (PAYMENT_STATUSES as readonly string[]).includes(rawPayment)
    ? (rawPayment as PaymentStatus)
    : undefined;
  const page = Number(pickOne(params.page) ?? 1);

  const [result, stats] = await Promise.all([
    listOrders({
      search,
      status,
      paymentStatus,
      page: Number.isFinite(page) ? page : 1,
    }),
    orderStats(),
  ]);

  const orders = result.items;
  const filtered = Boolean(search || status || paymentStatus);

  // Ô thống kê cũng là lối tắt lọc theo trạng thái.
  const tiles: { label: string; value: string; href?: string; highlight?: boolean }[] = [
    {
      label: "Chờ xác nhận",
      value: String(stats.byStatus.pending),
      href: "/admin/orders?status=pending",
      highlight: stats.byStatus.pending > 0,
    },
    {
      // Gộp hai trạng thái nên không làm lối tắt lọc (bộ lọc chọn một).
      label: `Đang xử lý · ${stats.byStatus.shipping} đang giao`,
      value: String(stats.byStatus.confirmed + stats.byStatus.shipping),
    },
    {
      label: "Hoàn thành",
      value: String(stats.byStatus.completed),
      href: "/admin/orders?status=completed",
    },
    { label: `Doanh thu · ${stats.today} đơn hôm nay`, value: formatVnd(stats.revenue) },
  ];

  const emptyState = (
    <EmptyState
      icon={<ReceiptIcon className="size-6" />}
      title={filtered ? "Không có kết quả" : "Chưa có đơn hàng nào"}
      description={
        filtered
          ? "Thử đổi từ khoá hoặc bỏ bộ lọc."
          : "Đơn khách đặt ở trang Product sẽ hiện ở đây."
      }
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đơn hàng"
        description="Đơn khách đặt từ trang Product. Xác nhận, giao, thu tiền và theo dõi lịch sử từng đơn."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <p
                className={`text-xl font-semibold tabular-nums ${
                  tile.highlight ? "text-amber-600 dark:text-amber-400" : ""
                }`}
              >
                {tile.value}
              </p>
              <p className="mt-0.5 truncate text-xs text-admin-muted">{tile.label}</p>
            </>
          );
          return tile.href ? (
            <Link
              key={tile.label}
              href={tile.href}
              className={`${CARD} px-4 py-3 transition hover:border-brand-300`}
            >
              {body}
            </Link>
          ) : (
            <div key={tile.label} className={`${CARD} px-4 py-3`}>
              {body}
            </div>
          );
        })}
      </section>

      <FilterBar>
        <Field label="Tìm kiếm" className="sm:min-w-56 sm:flex-1">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Mã đơn, tên, số điện thoại, email"
            className={INPUT}
          />
        </Field>
        <Field label="Trạng thái" className="sm:w-44">
          <SearchableSelect
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              ...ORDER_STATUSES.map((value) => ({
                value,
                label: ORDER_STATUS_LABELS[value],
                hint: String(stats.byStatus[value]),
              })),
            ]}
          />
        </Field>
        <Field label="Thanh toán" className="sm:w-44">
          <SearchableSelect
            name="paymentStatus"
            defaultValue={paymentStatus ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              ...PAYMENT_STATUSES.map((value) => ({
                value,
                label: PAYMENT_STATUS_LABELS[value],
              })),
            ]}
          />
        </Field>
        <div className="flex gap-2">
          <button type="submit" className={`${BUTTON.primary} flex-1 sm:flex-none`}>
            Lọc
          </button>
          {filtered && (
            <Link
              href="/admin/orders"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng */}
      <ul className="grid gap-3 md:hidden">
        {orders.map((order) => (
          <li key={order.id}>
            <Link href={`/admin/orders/${order.id}`} className={`${ROW_CARD} block`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-semibold">{order.code}</p>
                  <p className="text-xs text-admin-muted">
                    {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <Badge tone={ORDER_STATUS_TONES[order.status]}>
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>
              <p className="text-sm">
                {order.customerName} · {order.customerPhone}
              </p>
              <p className="truncate text-xs text-admin-muted">{itemsSummary(order)}</p>
              <div className="flex items-center justify-between border-t border-admin-border/60 pt-3">
                <span className="font-semibold tabular-nums">{formatVnd(order.total)}</span>
                <PaymentBadge order={order} />
              </div>
            </Link>
          </li>
        ))}
        {orders.length === 0 && <li className={CARD}>{emptyState}</li>}
      </ul>

      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Mã đơn</th>
              <th className={TABLE.th}>Khách hàng</th>
              <th className={TABLE.th}>Sản phẩm</th>
              <th className={`${TABLE.th} text-right`}>Tổng tiền</th>
              <th className={TABLE.th}>Thanh toán</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}>Ngày đặt</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className={TABLE.tr}>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-sm font-semibold text-brand-600 underline-offset-4 hover:underline"
                  >
                    {order.code}
                  </Link>
                </td>
                <td className={TABLE.td}>
                  <span className="block text-sm font-medium">{order.customerName}</span>
                  <span className="block text-xs text-admin-muted">{order.customerPhone}</span>
                </td>
                <td className={`${TABLE.td} max-w-64`}>
                  <span className="block truncate text-sm">{itemsSummary(order)}</span>
                  <span className="block text-xs text-admin-muted">
                    {order.itemCount} món
                  </span>
                </td>
                <td className={`${TABLE.td} text-right font-semibold whitespace-nowrap tabular-nums`}>
                  {formatVnd(order.total)}
                </td>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  <span className="mb-1 block text-xs text-admin-muted">
                    {PAYMENT_METHOD_SHORT[order.paymentMethod]}
                  </span>
                  <PaymentBadge order={order} />
                </td>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  <Badge tone={ORDER_STATUS_TONES[order.status]}>
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </td>
                <td className={`${TABLE.td} text-admin-muted whitespace-nowrap`}>
                  {formatDateTime(order.createdAt)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-0 py-0">
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        searchParams={params}
        basePath="/admin/orders"
      />
    </div>
  );
}
