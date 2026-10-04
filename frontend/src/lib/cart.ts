"use client";

import { useSyncExternalStore } from "react";

/**
 * Giỏ hàng lưu trong localStorage của trình duyệt.
 *
 * Chỉ giữ id + số lượng, KHÔNG giữ giá hay tên: giá có thể đổi (hết khuyến
 * mãi, admin sửa) sau khi khách bỏ vào giỏ. Trang giỏ hàng luôn hỏi lại giá
 * hiện hành từ server (xem app/api/cart/route.ts).
 */
export type CartLine = { id: number; qty: number };

const STORAGE_KEY = "uyvu-cart";
/** Báo cho các component trong CÙNG tab; tab khác nhận sự kiện `storage`. */
const CHANGE_EVENT = "uyvu-cart-change";

export const MAX_QTY = 99;

const EMPTY: CartLine[] = [];
let cache: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY };

function parse(raw: string | null): CartLine[] {
  if (!raw) return EMPTY;
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return EMPTY;
    return data
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          Number.isInteger((line as CartLine).id) &&
          Number.isInteger((line as CartLine).qty) &&
          (line as CartLine).qty > 0,
      )
      .map((line) => ({ id: line.id, qty: Math.min(line.qty, MAX_QTY) }));
  } catch {
    return EMPTY;
  }
}

/**
 * Đọc giỏ. Trả về cùng một mảng khi dữ liệu không đổi — useSyncExternalStore
 * so sánh bằng tham chiếu, mảng mới mỗi lần sẽ render lặp vô hạn.
 */
function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Chế độ riêng tư / chặn lưu trữ: coi như giỏ trống.
  }
  if (raw !== cache.raw) cache = { raw, lines: parse(raw) };
  return cache.lines;
}

function write(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Không lưu được thì thôi — giỏ chỉ mất khi tải lại trang.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Giỏ hàng hiện tại; phía server luôn là giỏ trống. */
export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Tổng số món (cộng dồn số lượng) cho huy hiệu ở header. */
export function useCartCount(): number {
  return useCart().reduce((sum, line) => sum + line.qty, 0);
}

export function addToCart(id: number, qty = 1): void {
  const lines = read();
  const found = lines.find((line) => line.id === id);
  write(
    found
      ? lines.map((line) =>
          line.id === id
            ? { ...line, qty: Math.min(line.qty + qty, MAX_QTY) }
            : line,
        )
      : [...lines, { id, qty: Math.min(qty, MAX_QTY) }],
  );
}

/** "Mua ngay": có trong giỏ rồi thì giữ nguyên số lượng, chưa có thì thêm 1. */
export function ensureInCart(id: number): void {
  if (!read().some((line) => line.id === id)) addToCart(id);
}

export function setCartQty(id: number, qty: number): void {
  if (qty <= 0) return removeFromCart(id);
  write(
    read().map((line) =>
      line.id === id ? { ...line, qty: Math.min(qty, MAX_QTY) } : line,
    ),
  );
}

export function removeFromCart(id: number): void {
  write(read().filter((line) => line.id !== id));
}

/** Bỏ nhiều món cùng lúc — dùng khi sản phẩm đã ngừng bán. */
export function removeManyFromCart(ids: number[]): void {
  const drop = new Set(ids);
  write(read().filter((line) => !drop.has(line.id)));
}

export function clearCart(): void {
  write([]);
}
