"use client";

import Link from "next/link";

import { CartIcon } from "@/components/admin/icons";
import { useCartCount } from "@/lib/cart";

/** Biểu tượng giỏ hàng trên header, kèm số món. */
export function CartLink() {
  const count = useCartCount();

  return (
    <Link
      href="/gio-hang"
      aria-label={count > 0 ? `Giỏ hàng (${count} món)` : "Giỏ hàng"}
      className="relative grid size-10 place-items-center rounded-lg border border-white/15 text-white/80 transition hover:bg-white/10 hover:text-white"
    >
      <CartIcon className="size-5" />
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-gold-400 px-1 text-[0.6875rem] font-bold text-ink-900 tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
