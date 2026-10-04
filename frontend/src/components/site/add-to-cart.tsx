"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { addToCart, ensureInCart } from "@/lib/cart";

/**
 * Nút "Thêm vào giỏ" + "Mua ngay".
 *
 * Sản phẩm chưa công bố giá thì không bỏ giỏ được (không có gì để cộng tiền)
 * — thay bằng nút xin báo giá dẫn sang form Liên hệ đã điền sẵn tên sản phẩm.
 */
export function AddToCart({
  productId,
  productName,
  hasPrice,
  inStock,
  size = "md",
}: {
  productId: number;
  productName: string;
  hasPrice: boolean;
  inStock: boolean;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);

  // Nhãn "Đã thêm ✓" tự tắt sau một lúc.
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(timer);
  }, [added]);

  const pad = size === "lg" ? "px-5 py-3 text-sm" : "px-3 py-2 text-sm";

  if (!hasPrice) {
    const query = new URLSearchParams({
      "chu-de": `Báo giá: ${productName}`,
    });
    return (
      <Link
        href={`/lien-he?${query}`}
        className={`inline-flex w-full items-center justify-center rounded-lg bg-ink-900 font-semibold text-white transition hover:bg-ink-800 ${pad}`}
      >
        Liên hệ báo giá
      </Link>
    );
  }

  if (!inStock) {
    return (
      <button
        type="button"
        disabled
        className={`w-full cursor-not-allowed rounded-lg border border-black/10 bg-black/5 font-semibold text-black/40 ${pad}`}
      >
        Tạm hết hàng
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => {
          addToCart(productId);
          setAdded(true);
        }}
        className={`cursor-pointer rounded-lg border font-semibold transition ${pad} ${
          added
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-gold-400 text-gold-800 hover:bg-gold-50"
        }`}
      >
        {added ? "Đã thêm ✓" : "Thêm vào giỏ"}
      </button>
      <button
        type="button"
        onClick={() => {
          // Mua ngay: vào thẳng trang đặt hàng, bỏ qua bước xem giỏ.
          ensureInCart(productId);
          router.push("/dat-hang");
        }}
        className={`cursor-pointer rounded-lg bg-ink-900 font-semibold text-white transition hover:bg-ink-800 ${pad}`}
      >
        Mua ngay
      </button>
    </div>
  );
}
