import Link from "next/link";

import { ProductCard } from "@/components/site/product-card";
import {
  ProductFilters,
  ProductSortSelect,
} from "@/components/site/product-filters";
import { COMPANY_NAME } from "@/lib/company";
import {
  PARAM,
  productsHref,
  type ProductFilterValues,
} from "@/lib/product-filters";
import {
  PRICE_SLIDER_MAX,
  PRODUCT_SORTS,
  listProductCategories,
  listProducts,
  type ProductSort,
} from "@/lib/products";

export const metadata = {
  title: "Product",
  description: `Sản phẩm và giải pháp của ${COMPANY_NAME}.`,
};

/** Giá và tồn kho đổi liên tục nên không cache ở tầng route. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Số nguyên không âm từ query string, sai thì dùng giá trị mặc định. */
function readInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export default async function ProductsPage(props: PageProps<"/san-pham">) {
  const params = await props.searchParams;

  const rawCategory = readInt(pickOne(params[PARAM.category]), 0);
  const rawSort = pickOne(params[PARAM.sort]) ?? "";
  const minPrice = Math.min(readInt(pickOne(params[PARAM.minPrice]), 0), PRICE_SLIDER_MAX);
  const maxPrice = Math.min(
    readInt(pickOne(params[PARAM.maxPrice]), PRICE_SLIDER_MAX),
    PRICE_SLIDER_MAX,
  );

  const values: ProductFilterValues = {
    search: (pickOne(params[PARAM.search]) ?? "").trim().slice(0, 140),
    categoryDetailId: rawCategory > 0 ? rawCategory : undefined,
    minPrice,
    maxPrice: Math.max(maxPrice, minPrice),
    sort: (PRODUCT_SORTS as readonly string[]).includes(rawSort)
      ? (rawSort as ProductSort)
      : "launch-desc",
  };
  const page = Math.max(1, readInt(pickOne(params[PARAM.page]), 1));
  const priceFiltered = values.minPrice > 0 || values.maxPrice < PRICE_SLIDER_MAX;
  const filtered =
    priceFiltered || values.search !== "" || values.categoryDetailId !== undefined;

  const [result, categories] = await Promise.all([
    // `live` để backend quyết định thế nào là "đang bán" — nháp và hàng đã
    // ngừng bán không lọt ra đây.
    listProducts({
      live: true,
      search: values.search || undefined,
      categoryDetailId: values.categoryDetailId,
      // Kéo kịch phải = không giới hạn trên; không kéo gì = không lọc giá
      // (để sản phẩm "Liên hệ" vẫn hiện).
      minPrice: priceFiltered ? values.minPrice : undefined,
      maxPrice: values.maxPrice < PRICE_SLIDER_MAX ? values.maxPrice : undefined,
      sort: values.sort,
      page,
      pageSize: PAGE_SIZE,
    }),
    listProductCategories(true),
  ]);

  const products = result.items;
  const active = categories.find((c) => c.id === values.categoryDetailId);
  // Bộ lọc giữ state riêng; đổi URL (sắp xếp, xoá lọc, nút back) thì dựng lại.
  const filterKey = JSON.stringify(values);

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Product
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {active ? active.name : "Sản phẩm & giải pháp"}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Phần mềm, hạ tầng và dịch vụ công nghệ cho doanh nghiệp.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[17rem_1fr] lg:px-8 lg:py-14">
        {/* Bộ lọc: cột trái trên màn rộng, gập lại trên điện thoại */}
        {/* Bộ lọc: cột trái luôn mở trên màn rộng; trên điện thoại gập lại
            (mở sẵn nếu đang lọc) để danh sách không bị đẩy xuống quá sâu. */}
        <aside>
          <details
            className="group rounded-2xl border border-black/10 bg-white lg:hidden"
            open={filtered}
          >
            <summary className="flex cursor-pointer items-center justify-between px-5 py-4 text-sm font-semibold">
              Tìm kiếm sản phẩm{filtered && " · đang lọc"}
              <span className="text-black/40 transition group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="border-t border-black/10 p-5">
              <ProductFilters key={filterKey} categories={categories} values={values} />
            </div>
          </details>

          <div className="hidden rounded-2xl border border-black/10 bg-white lg:sticky lg:top-24 lg:block">
            <h2 className="px-5 py-4 text-sm font-semibold">Tìm kiếm sản phẩm</h2>
            <div className="border-t border-black/10 p-5">
              <ProductFilters key={filterKey} categories={categories} values={values} />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-black/55">
              {result.total > 0
                ? `${result.total} sản phẩm`
                : "Không có sản phẩm phù hợp"}
            </p>
            <ProductSortSelect values={values} />
          </div>

          {products.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-black/15 px-6 py-20 text-center">
              <p className="text-lg font-medium">
                Không tìm thấy sản phẩm phù hợp.
              </p>
              <p className="mt-2 text-sm text-black/55">
                Thử đổi từ khoá, chọn lĩnh vực khác hoặc nới khoảng giá.
              </p>
              <Link
                href="/san-pham"
                className="mt-6 inline-flex rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                Xem tất cả sản phẩm
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {result.totalPages > 1 && (
            <nav
              aria-label="Phân trang"
              className="mt-12 flex flex-wrap items-center justify-center gap-2"
            >
              {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(
                (number) => (
                  <Link
                    key={number}
                    href={productsHref(values, number)}
                    aria-current={number === result.page ? "page" : undefined}
                    className={`grid h-9 min-w-9 place-items-center rounded-lg px-3 text-sm font-medium tabular-nums transition ${
                      number === result.page
                        ? "bg-ink-900 text-white"
                        : "border border-black/10 text-black/60 hover:border-gold-400 hover:text-gold-700"
                    }`}
                  >
                    {number}
                  </Link>
                ),
              )}
            </nav>
          )}
        </div>
      </section>
    </>
  );
}
