import Link from "next/link";

import { AddToCart } from "@/components/site/add-to-cart";
import { ProductPrice } from "@/components/site/product-price";
import type { Product } from "@/lib/products";

/** Ảnh sản phẩm trong khung cố định; chưa có ảnh thì khối màu theo chữ cái đầu. */
export function ProductImage({
  product,
  className,
}: {
  product: Pick<Product, "image" | "name">;
  className: string;
}) {
  if (product.image) {
    return (
      // Ảnh có thể là link ngoài tuỳ ý nên dùng img thường (next/image cần
      // khai báo từng domain).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={product.image}
        alt={product.name}
        loading="lazy"
        className={`${className} object-cover`}
      />
    );
  }
  return (
    <div
      className={`${className} grid place-items-center bg-gradient-to-br from-ink-900 via-ink-800 to-gold-800`}
    >
      <span className="text-4xl font-semibold text-gold-300/70">
        {product.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const href = `/san-pham/${product.slug}`;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-gold-400/60 hover:shadow-lg">
      <Link href={href} className="relative block" tabIndex={-1} aria-hidden>
        <ProductImage product={product} className="h-48 w-full" />
        {product.discountPercent !== null && (
          <span className="absolute top-3 left-3 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white shadow">
            −{product.discountPercent}%
          </span>
        )}
        {!product.inStock && (
          <span className="absolute top-3 right-3 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
            Hết hàng
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        {product.category && (
          <p className="text-xs font-semibold tracking-wider text-gold-700 uppercase">
            {product.category.name}
          </p>
        )}
        <h3 className="mt-1.5 text-base font-semibold text-balance">
          <Link
            href={href}
            className="transition group-hover:text-gold-700 hover:underline underline-offset-4"
          >
            {product.name}
          </Link>
        </h3>
        {product.summary && (
          <p className="mt-2 line-clamp-3 flex-1 text-sm text-black/60">
            {product.summary}
          </p>
        )}

        <div className="mt-4 border-t border-black/10 pt-4">
          <ProductPrice product={product} />
          <div className="mt-3">
            <AddToCart
              productId={product.id}
              productName={product.name}
              hasPrice={product.price !== null}
              inStock={product.inStock}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
