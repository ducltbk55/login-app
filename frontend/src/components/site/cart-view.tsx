"use client";

import Link from "next/link";

import { ProductImage } from "@/components/site/product-card";
import { canBuy, useCartProducts } from "@/components/site/use-cart-products";
import {
  MAX_QTY,
  clearCart,
  removeFromCart,
  setCartQty,
  useCart,
} from "@/lib/cart";
import { formatVnd } from "@/lib/format";

export function CartView() {
  const cart = useCart();
  const data = useCartProducts();

  if (data.status === "empty") {
    return (
      <div className="rounded-3xl border border-dashed border-black/15 px-6 py-20 text-center">
        <p className="text-lg font-medium">Giỏ hàng đang trống.</p>
        <p className="mt-2 text-sm text-black/55">
          Xem các sản phẩm và giải pháp của chúng tôi.
        </p>
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
        Không tải được thông tin giỏ hàng. Vui lòng tải lại trang.
      </p>
    );
  }

  if (data.status === "loading") {
    return (
      <div className="space-y-3" aria-busy="true">
        {cart.map((line) => (
          <div key={line.id} className="h-28 animate-pulse rounded-2xl bg-black/5" />
        ))}
      </div>
    );
  }

  const { rows, buyable, total, saved } = data;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-3">
        {rows.map(({ product, qty }) => {
          const unavailable = !canBuy(product);
          return (
            <li
              key={product.id}
              className="flex gap-4 rounded-2xl border border-black/10 bg-white p-4"
            >
              <Link href={`/san-pham/${product.slug}`} className="shrink-0">
                <ProductImage product={product} className="size-24 rounded-xl" />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/san-pham/${product.slug}`}
                    className="font-semibold underline-offset-4 hover:underline"
                  >
                    {product.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFromCart(product.id)}
                    className="shrink-0 cursor-pointer text-sm text-black/45 transition hover:text-red-600"
                  >
                    Xoá
                  </button>
                </div>

                {unavailable ? (
                  <p className="text-sm font-medium text-red-600">
                    {product.inStock
                      ? "Sản phẩm chưa có giá — vui lòng liên hệ báo giá."
                      : "Tạm hết hàng — không tính vào đơn."}
                  </p>
                ) : (
                  <p className="text-sm tabular-nums">
                    <span className="font-semibold">
                      {formatVnd(product.effectivePrice ?? 0)}
                    </span>
                    {product.salePrice !== null && product.price !== null && (
                      <>
                        {" "}
                        <s className="text-black/45">{formatVnd(product.price)}</s>{" "}
                        <span className="text-xs font-semibold text-red-600">
                          −{product.discountPercent}%
                        </span>
                      </>
                    )}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between gap-3">
                  <div className="inline-flex items-center rounded-lg border border-black/15">
                    <button
                      type="button"
                      aria-label="Giảm số lượng"
                      onClick={() => setCartQty(product.id, qty - 1)}
                      className="size-9 cursor-pointer text-lg text-black/60 transition hover:bg-black/5"
                    >
                      −
                    </button>
                    <input
                      aria-label="Số lượng"
                      inputMode="numeric"
                      value={qty}
                      onChange={(event) => {
                        const next = Number(event.target.value.replace(/\D/g, ""));
                        if (next > 0) setCartQty(product.id, next);
                      }}
                      className="w-12 border-x border-black/15 py-1.5 text-center text-sm tabular-nums outline-none"
                    />
                    <button
                      type="button"
                      aria-label="Tăng số lượng"
                      disabled={qty >= MAX_QTY}
                      onClick={() => setCartQty(product.id, qty + 1)}
                      className="size-9 cursor-pointer text-lg text-black/60 transition hover:bg-black/5 disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  {!unavailable && (
                    <p className="font-semibold tabular-nums">
                      {formatVnd((product.effectivePrice ?? 0) * qty)}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit rounded-2xl border border-black/10 bg-gold-50/50 p-6 lg:sticky lg:top-24">
        <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-black/60">Số sản phẩm</dt>
            <dd className="tabular-nums">
              {buyable.reduce((sum, row) => sum + row.qty, 0)}
            </dd>
          </div>
          {saved > 0 && (
            <div className="flex justify-between text-red-600">
              <dt>Tiết kiệm</dt>
              <dd className="tabular-nums">−{formatVnd(saved)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-black/10 pt-3 text-base font-semibold">
            <dt>Tổng cộng</dt>
            <dd className="tabular-nums">{formatVnd(total)}</dd>
          </div>
        </dl>

        {buyable.length > 0 ? (
          <Link
            href="/dat-hang"
            className="mt-6 flex w-full items-center justify-center rounded-lg bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink-800"
          >
            Tiến hành đặt hàng
          </Link>
        ) : (
          <p className="mt-6 text-sm text-black/55">
            Chưa có sản phẩm nào đặt được trong giỏ.
          </p>
        )}

        <div className="mt-5 flex justify-between text-sm">
          <Link href="/san-pham" className="font-medium text-gold-700 hover:underline">
            ← Tiếp tục mua
          </Link>
          <button
            type="button"
            onClick={() => clearCart()}
            className="cursor-pointer text-black/45 transition hover:text-red-600"
          >
            Xoá giỏ hàng
          </button>
        </div>
      </aside>
    </div>
  );
}
