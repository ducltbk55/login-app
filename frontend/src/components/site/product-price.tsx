import { formatVnd } from "@/lib/format";
import type { Product } from "@/lib/products";

/**
 * Giá như khách thấy: có khuyến mãi thì giá mới nổi bật, giá niêm yết gạch
 * ngang và nhãn % giảm; chưa công bố giá thì "Liên hệ".
 */
export function ProductPrice({
  product,
  size = "md",
}: {
  product: Pick<Product, "price" | "salePrice" | "discountPercent">;
  size?: "md" | "lg";
}) {
  const big = size === "lg";

  if (product.price === null) {
    return (
      <p
        className={`font-semibold text-gold-700 ${big ? "text-2xl" : "text-lg"}`}
      >
        Liên hệ
      </p>
    );
  }

  if (product.salePrice === null) {
    return (
      <p
        className={`font-semibold tabular-nums ${big ? "text-3xl" : "text-lg"}`}
      >
        {formatVnd(product.price)}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p
        className={`font-semibold text-red-600 tabular-nums ${big ? "text-3xl" : "text-lg"}`}
      >
        {formatVnd(product.salePrice)}
      </p>
      <s
        className={`text-black/45 tabular-nums ${big ? "text-base" : "text-sm"}`}
      >
        {formatVnd(product.price)}
      </s>
      <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-600 ring-1 ring-red-200 ring-inset">
        −{product.discountPercent}%
      </span>
    </div>
  );
}
