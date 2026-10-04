"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";

import {
  placeOrderAction,
  type CheckoutState,
  type CheckoutValues,
} from "@/app/(site)/dat-hang/actions";
import { BankTransferInfo } from "@/components/site/bank-transfer-info";
import { ProductImage } from "@/components/site/product-card";
import { useCartProducts } from "@/components/site/use-cart-products";
import { removeManyFromCart } from "@/lib/cart";
import { COMPANY_PROFILE } from "@/lib/company";
import { formatVnd } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/lib/orders";

const INITIAL: CheckoutState = { status: "idle" };

const INPUT =
  "w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-200";

function SubmitButton({ total }: { total: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-ink-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? "Đang đặt hàng…" : `Đặt hàng · ${formatVnd(total)}`}
    </button>
  );
}

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-black/50">{hint}</span>}
    </label>
  );
}

/** Màn hình sau khi đặt thành công. */
function Placed({
  order,
  loggedIn,
}: {
  order: Extract<CheckoutState, { status: "placed" }>["order"];
  loggedIn: boolean;
}) {
  // Bỏ khỏi giỏ đúng những món vừa đặt; món hết hàng / chưa có giá vẫn nằm lại.
  useEffect(() => {
    if (order) removeManyFromCart(order.productIds);
  }, [order]);

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-gold-300 bg-gold-50/70 p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-ink-900 text-2xl text-gold-300">
        ✓
      </div>
      <h2 className="mt-4 text-2xl font-semibold">Đặt hàng thành công</h2>
      {order ? (
        <>
          <p className="mt-3 text-black/70">
            Mã đơn của bạn là{" "}
            <strong className="font-mono text-lg text-ink-900">{order.code}</strong>
            . Tổng thanh toán{" "}
            <strong className="text-ink-900">{formatVnd(order.total)}</strong>.
          </p>
          <p className="mt-3 text-sm text-black/60">
            Chúng tôi sẽ gọi điện xác nhận đơn trong giờ làm việc (
            {COMPANY_PROFILE.workingHours}).
          </p>
          {order.paymentMethod === "bank_transfer" && (
            <div className="mt-5">
              <p className="mb-2 text-left text-sm font-semibold">
                Thông tin chuyển khoản
              </p>
              <BankTransferInfo orderCode={order.code} amount={order.total} />
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-black/70">Chúng tôi sẽ liên hệ xác nhận đơn sớm.</p>
      )}
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        {loggedIn && (
          <Link
            href="/dashboard#don-hang"
            className="rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Theo dõi đơn hàng
          </Link>
        )}
        <Link
          href="/san-pham"
          className="rounded-lg border border-black/15 px-5 py-2.5 text-sm font-medium transition hover:bg-black/5"
        >
          Tiếp tục mua sắm
        </Link>
      </div>
      <p className="mt-5 text-xs text-black/50">
        Cần hỗ trợ? Gọi {COMPANY_PROFILE.phone} và đọc mã đơn.
      </p>
    </div>
  );
}

export function CheckoutForm({
  defaults,
  loggedIn,
}: {
  /** Điền sẵn từ hồ sơ khi đã đăng nhập. */
  defaults: Partial<CheckoutValues>;
  loggedIn: boolean;
}) {
  const [state, formAction] = useActionState(placeOrderAction, INITIAL);
  const data = useCartProducts();

  if (state.status === "placed") {
    return <Placed order={state.order} loggedIn={loggedIn} />;
  }

  if (data.status === "empty") {
    return (
      <div className="rounded-3xl border border-dashed border-black/15 px-6 py-20 text-center">
        <p className="text-lg font-medium">Chưa có sản phẩm nào để đặt.</p>
        <Link
          href="/san-pham"
          className="mt-6 inline-flex rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
        >
          Xem sản phẩm
        </Link>
      </div>
    );
  }
  if (data.status === "error") {
    return (
      <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Không tải được giỏ hàng. Vui lòng tải lại trang.
      </p>
    );
  }
  if (data.status === "loading") {
    return <div className="h-96 animate-pulse rounded-3xl bg-black/5" aria-busy="true" />;
  }

  const { rows, buyable, total, saved } = data;
  const skipped = rows.length - buyable.length;
  // Gửi lỗi xong thì giữ lại nội dung khách đã gõ.
  const values = state.status === "error" ? state.values : defaults;

  if (buyable.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-black/15 px-6 py-16 text-center">
        <p className="text-lg font-medium">
          Các sản phẩm trong giỏ hiện chưa đặt được (hết hàng hoặc chưa có giá).
        </p>
        <Link
          href="/gio-hang"
          className="mt-6 inline-flex rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
        >
          Về giỏ hàng
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      // React reset form sau mỗi lần gửi; đổi key để dựng lại các ô với
      // defaultValue là nội dung vừa gõ — kể cả khi gửi hỏng nhiều lần liền.
      key={state.status === "error" ? state.attempt : "idle"}
      className="grid gap-8 lg:grid-cols-[1fr_24rem]"
    >
      {/* Bẫy bot: người thật không nhìn thấy nên không bao giờ điền */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="checkout-website">Để trống ô này</label>
        <input id="checkout-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <input
        type="hidden"
        name="items"
        value={JSON.stringify(
          buyable.map((row) => ({ productId: row.product.id, quantity: row.qty })),
        )}
      />

      <div className="space-y-6">
        <section className="rounded-2xl border border-black/10 bg-white p-6">
          <h2 className="text-lg font-semibold">Thông tin người nhận</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Họ tên" required>
              <input
                name="customerName"
                required
                maxLength={120}
                autoComplete="name"
                defaultValue={values.customerName}
                className={INPUT}
              />
            </Field>
            <Field label="Số điện thoại" required hint="Để chúng tôi gọi xác nhận đơn.">
              <input
                name="customerPhone"
                type="tel"
                required
                maxLength={20}
                pattern="[0-9+\s().\-]{8,20}"
                autoComplete="tel"
                defaultValue={values.customerPhone}
                className={INPUT}
              />
            </Field>
            <Field label="Email" hint="Nhận thông tin đơn qua email (tuỳ chọn).">
              <input
                name="customerEmail"
                type="email"
                maxLength={160}
                autoComplete="email"
                defaultValue={values.customerEmail}
                className={INPUT}
              />
            </Field>
            <Field label="Địa chỉ" hint="Nơi giao hàng / triển khai.">
              <input
                name="address"
                maxLength={300}
                autoComplete="street-address"
                defaultValue={values.address}
                className={INPUT}
              />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Ghi chú">
              <textarea
                name="note"
                rows={3}
                maxLength={1000}
                defaultValue={values.note}
                placeholder="Thời gian tiện liên hệ, yêu cầu xuất hoá đơn…"
                className={`${INPUT} resize-y`}
              />
            </Field>
          </div>
        </section>

        <fieldset className="rounded-2xl border border-black/10 bg-white p-6">
          <legend className="sr-only">Hình thức thanh toán</legend>
          <h2 className="text-lg font-semibold" aria-hidden>
            Hình thức thanh toán
          </h2>
          <div className="mt-4 space-y-3">
            {PAYMENT_METHODS.map((method) => (
              // `group`: khối tài khoản ngân hàng chỉ hiện khi chọn chuyển khoản.
              <div key={method} className="group">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 p-4 transition has-checked:border-gold-500 has-checked:bg-gold-50/60">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    defaultChecked={(values.paymentMethod ?? "cod") === method}
                    className="mt-0.5 accent-gold-600"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      {PAYMENT_METHOD_LABELS[method]}
                    </span>
                    <span className="mt-0.5 block text-xs text-black/55">
                      {method === "cod"
                        ? "Thanh toán khi nhận hàng hoặc khi nghiệm thu dịch vụ."
                        : "Chuyển khoản trước, chúng tôi xác nhận khi nhận được tiền."}
                    </span>
                  </span>
                </label>
                {method === "bank_transfer" && (
                  <BankTransferInfo className="mt-2 hidden group-has-checked:block" />
                )}
              </div>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="h-fit rounded-2xl border border-black/10 bg-gold-50/50 p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Đơn hàng</h2>
        <ul className="mt-4 space-y-3">
          {buyable.map(({ product, qty }) => (
            <li key={product.id} className="flex gap-3 text-sm">
              <ProductImage product={product} className="size-14 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{product.name}</p>
                <p className="text-black/55 tabular-nums">
                  {formatVnd(product.effectivePrice ?? 0)} × {qty}
                </p>
              </div>
              <p className="font-medium tabular-nums">
                {formatVnd((product.effectivePrice ?? 0) * qty)}
              </p>
            </li>
          ))}
        </ul>

        {skipped > 0 && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {skipped} sản phẩm hết hàng hoặc chưa có giá không được tính vào đơn
            này và vẫn nằm trong giỏ.
          </p>
        )}

        <dl className="mt-5 space-y-2 border-t border-black/10 pt-4 text-sm">
          {saved > 0 && (
            <div className="flex justify-between text-red-600">
              <dt>Tiết kiệm</dt>
              <dd className="tabular-nums">−{formatVnd(saved)}</dd>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold">
            <dt>Tổng thanh toán</dt>
            <dd className="tabular-nums">{formatVnd(total)}</dd>
          </div>
        </dl>

        {state.status === "error" && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            {state.error}
          </p>
        )}

        <div className="mt-5">
          <SubmitButton total={total} />
        </div>
        <p className="mt-3 text-center text-xs text-black/50">
          Giá cuối cùng được xác nhận khi đặt hàng.{" "}
          <Link href="/gio-hang" className="underline underline-offset-2">
            Sửa giỏ hàng
          </Link>
        </p>
      </aside>
    </form>
  );
}
