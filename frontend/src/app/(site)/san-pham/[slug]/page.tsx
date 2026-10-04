import Link from "next/link";
import { notFound } from "next/navigation";

import { DocumentTextIcon, SlidersIcon } from "@/components/admin/icons";
import { AddToCart } from "@/components/site/add-to-cart";
import { ProductCard, ProductImage } from "@/components/site/product-card";
import { ProductGallery } from "@/components/site/product-gallery";
import { ProductMedia } from "@/components/site/product-media";
import { ProductPrice } from "@/components/site/product-price";
import { Tabs } from "@/components/site/tabs";
import { COMPANY_NAME } from "@/lib/company";
import { formatDate } from "@/lib/format";
import {
  findProductBySlug,
  listProducts,
  type ProductSpec,
} from "@/lib/products";
import { parseVideoUrl } from "@/lib/video";

// Kiểu dáng chuẩn của CKEditor cho ảnh, bảng… trong phần mô tả.
import "ckeditor5/ckeditor5-content.css";

export const dynamic = "force-dynamic";

/** Bảng thông số kỹ thuật: hai cột nhãn – giá trị, sọc xen kẽ cho dễ dò. */
function SpecsTable({ specs }: { specs: ProductSpec[] }) {
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
      <table className="w-full text-left text-sm sm:text-base">
        <tbody>
          {specs.map((spec) => (
            <tr key={spec.label} className="odd:bg-gold-50/50">
              <th
                scope="row"
                className="w-2/5 border-r border-black/5 px-4 py-3 align-top font-medium text-black/60 sm:w-1/3 lg:w-1/4"
              >
                {spec.label}
              </th>
              <td className="px-4 py-3 align-top whitespace-pre-line text-black/85">
                {spec.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function generateMetadata(props: PageProps<"/san-pham/[slug]">) {
  const { slug } = await props.params;
  const product = await findProductBySlug(slug);

  if (!product || !product.live) return { title: "Không tìm thấy sản phẩm" };

  return {
    title: product.name,
    description: product.summary ?? undefined,
    openGraph: {
      title: product.name,
      description: product.summary ?? undefined,
      images: product.image ? [product.image] : undefined,
      siteName: COMPANY_NAME,
    },
  };
}

export default async function ProductPage(props: PageProps<"/san-pham/[slug]">) {
  const { slug } = await props.params;
  const product = await findProductBySlug(slug);

  // `live` chứ không chỉ "tồn tại": bản nháp và hàng ngừng bán không được lộ
  // ra ngoài chỉ vì ai đó đoán đúng đường dẫn.
  if (!product || !product.live) notFound();

  // Có bộ sưu tập thì chạy slideshow các ảnh đó; không có thì hiện ảnh sản
  // phẩm như cũ. `?? []`: backend bản cũ (chưa có cột gallery) không trả
  // trường này — trang vẫn phải hiển thị được.
  const slides = [...new Set(product.gallery ?? [])];
  // `?? []`: backend bản cũ (chưa có cột specs) không trả trường này.
  const specs = product.specs ?? [];
  // `?? null`: backend bản cũ chưa có cột videoUrl. Link lạ (sửa tay DB) thì
  // parseVideoUrl trả null — bỏ qua chứ không nhúng.
  const video = product.videoUrl ? parseVideoUrl(product.videoUrl) : null;
  const discountBadge = product.discountPercent !== null && (
    <span className="pointer-events-none absolute top-4 left-4 rounded-lg bg-red-600 px-2.5 py-1 text-sm font-semibold text-white shadow">
      −{product.discountPercent}%
    </span>
  );

  const images =
    slides.length > 0 ? (
      <ProductGallery images={slides} alt={product.name}>
        {discountBadge}
      </ProductGallery>
    ) : (
      <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white">
        <ProductImage product={product} className="h-72 w-full sm:h-96 lg:h-[28rem]" />
        {discountBadge}
      </div>
    );

  const related = (
    await listProducts({
      live: true,
      categoryDetailId: product.categoryDetailId,
      pageSize: 4,
    })
  ).items
    .filter((item) => item.id !== product.id)
    .slice(0, 3);

  return (
    <>
      <nav
        aria-label="Đường dẫn"
        className="mx-auto w-full max-w-7xl px-4 pt-8 text-sm text-black/50 sm:px-6 lg:px-8"
      >
        <Link href="/san-pham" className="hover:text-gold-700">
          Product
        </Link>
        {product.category && (
          <>
            {" / "}
            <Link
              href={`/san-pham?linh-vuc=${product.categoryDetailId}`}
              className="hover:text-gold-700"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:px-8">
        {/* Có video thì thêm tab "Video" cạnh "Hình ảnh"; không thì như cũ. */}
        {video ? (
          <ProductMedia
            video={video}
            title={product.name}
            images={images}
            imageCount={slides.length || (product.image ? 1 : undefined)}
          />
        ) : (
          images
        )}

        <div className="flex flex-col">
          {product.category && (
            <p className="text-xs font-semibold tracking-wider text-gold-700 uppercase">
              {product.category.name}
            </p>
          )}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {product.name}
          </h1>

          <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-black/55">
            {product.sku && (
              <div className="flex gap-1">
                <dt>Mã:</dt>
                <dd className="font-mono text-black/75">{product.sku}</dd>
              </div>
            )}
            {product.launchedAt && (
              <div className="flex gap-1">
                <dt>Ra mắt:</dt>
                <dd className="text-black/75">{formatDate(product.launchedAt)}</dd>
              </div>
            )}
            <div className="flex gap-1">
              <dt>Tình trạng:</dt>
              <dd
                className={
                  product.inStock ? "font-medium text-emerald-700" : "font-medium text-red-600"
                }
              >
                {product.inStock ? "Còn hàng" : "Tạm hết hàng"}
              </dd>
            </div>
          </dl>

          {product.summary && (
            <p className="mt-5 text-lg leading-relaxed text-black/70">
              {product.summary}
            </p>
          )}

          <div className="mt-6 rounded-2xl border border-black/10 bg-gold-50/50 p-5">
            <ProductPrice product={product} size="lg" />
            <div className="mt-4">
              <AddToCart
                productId={product.id}
                productName={product.name}
                hasPrice={product.price !== null}
                inStock={product.inStock}
                size="lg"
              />
            </div>
          </div>
        </div>
      </section>

      {(product.description || specs.length > 0) && (
        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <h2 className="sr-only">Thông tin sản phẩm</h2>
          <Tabs
            // Chưa có mô tả mà có thông số thì mở sẵn tab thông số.
            defaultTab={product.description ? "mo-ta" : "thong-so-ky-thuat"}
            tabs={[
              {
                id: "mo-ta",
                label: "Mô tả sản phẩm",
                icon: <DocumentTextIcon className="size-5" />,
                content: product.description ? (
                  // HTML đã được backend lọc theo allowlist cả lúc lưu lẫn lúc đọc.
                  <div
                    className="ck-content article-content"
                    dangerouslySetInnerHTML={{ __html: product.description }}
                  />
                ) : (
                  <p className="text-black/55">Mô tả đang được cập nhật.</p>
                ),
              },
              // Tab thông số chỉ có khi sản phẩm có dữ liệu.
              ...(specs.length > 0
                ? [
                    {
                      id: "thong-so-ky-thuat",
                      label: "Thông số kỹ thuật",
                      icon: <SlidersIcon className="size-5" />,
                      badge: specs.length,
                      content: <SpecsTable specs={specs} />,
                    },
                  ]
                : []),
            ]}
          />
        </section>
      )}

      {related.length > 0 && (
        <section className="border-t border-black/10 bg-gold-50/40">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Cùng lĩnh vực {product.category?.name}
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
