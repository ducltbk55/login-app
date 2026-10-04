"use client";

import { useEffect, useMemo, useState } from "react";

import { removeManyFromCart, useCart } from "@/lib/cart";

/** Đúng các trường /api/cart trả về. */
export type CartProduct = {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  price: number | null;
  salePrice: number | null;
  effectivePrice: number | null;
  discountPercent: number | null;
  inStock: boolean;
};

export type CartRow = { product: CartProduct; qty: number };

type Loaded =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; key: string; products: Map<number, CartProduct> };

export type CartProducts =
  | { status: "empty" }
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      rows: CartRow[];
      /** Còn hàng và có giá — những dòng đặt được. */
      buyable: CartRow[];
      /** Tổng tiền khách trả của các dòng đặt được. */
      total: number;
      /** Tiền được giảm nhờ khuyến mãi. */
      saved: number;
    };

export const canBuy = (product: CartProduct) =>
  product.inStock && product.effectivePrice !== null;

/**
 * Giỏ hàng kèm thông tin hiện hành của từng sản phẩm.
 *
 * Giỏ chỉ giữ id + số lượng; giá hỏi lại server mỗi khi tập sản phẩm đổi
 * (đổi số lượng thì không cần gọi lại). Sản phẩm đã ngừng bán / bị xoá thì
 * server không trả về — tự bỏ khỏi giỏ.
 */
export function useCartProducts(): CartProducts {
  const cart = useCart();
  const ids = useMemo(
    () => cart.map((line) => line.id).sort((a, b) => a - b),
    [cart],
  );
  const key = ids.join(",");
  const [loaded, setLoaded] = useState<Loaded>({ status: "loading" });

  useEffect(() => {
    if (key === "") return;
    let cancelled = false;
    fetch(`/api/cart?ids=${key}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json() as Promise<{ items: CartProduct[] }>;
      })
      .then(({ items }) => {
        if (cancelled) return;
        setLoaded({
          status: "ready",
          key,
          products: new Map(items.map((item) => [item.id, item])),
        });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const ready = loaded.status === "ready" && loaded.key === key;
  const missing = ready ? ids.filter((id) => !loaded.products.has(id)) : [];
  const missingKey = missing.join(",");
  useEffect(() => {
    if (missingKey) removeManyFromCart(missingKey.split(",").map(Number));
  }, [missingKey]);

  if (cart.length === 0) return { status: "empty" };
  if (loaded.status === "error") return { status: "error" };
  if (!ready) return { status: "loading" };

  const rows = cart
    .map((line) => ({ product: loaded.products.get(line.id), qty: line.qty }))
    .filter((row): row is CartRow => row.product !== undefined);
  const buyable = rows.filter((row) => canBuy(row.product));

  return {
    status: "ready",
    rows,
    buyable,
    total: buyable.reduce(
      (sum, row) => sum + (row.product.effectivePrice ?? 0) * row.qty,
      0,
    ),
    saved: buyable.reduce(
      (sum, row) =>
        sum +
        (row.product.salePrice !== null && row.product.price !== null
          ? (row.product.price - row.product.salePrice) * row.qty
          : 0),
      0,
    ),
  };
}
