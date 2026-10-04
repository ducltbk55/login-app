import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import { BoxIcon, PencilIcon } from "@/components/admin/icons";
import { Field, FilterBar, PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { Badge } from "@/components/badge";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatDateTime, formatVnd } from "@/lib/format";
import {
  PRODUCT_SORT_LABELS,
  PRODUCT_SORTS,
  PRODUCT_STATUS_LABELS,
  listProductCategories,
  listProducts,
  type Product,
  type ProductSort,
  type ProductStatus,
} from "@/lib/products";
import {
  BUTTON,
  BUTTON_SM,
  CARD,
  ICON_BUTTON,
  INPUT,
  ROW_CARD,
  TABLE,
} from "@/lib/styles";
import {
  deleteProductAction,
  setProductStatusAction,
  toggleProductStockAction,
} from "./actions";

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function statusBadge(product: Product) {
  const tone =
    product.status === "published"
      ? "success"
      : product.status === "archived"
        ? "danger"
        : "neutral";
  return <Badge tone={tone}>{PRODUCT_STATUS_LABELS[product.status]}</Badge>;
}

/** Giá như khách thấy, gọn cho bảng. */
function PriceCell({ product }: { product: Product }) {
  if (product.price === null) {
    return <span className="text-admin-muted">Liên hệ</span>;
  }
  if (product.salePrice === null) {
    return <span className="tabular-nums">{formatVnd(product.price)}</span>;
  }
  return (
    <span className="tabular-nums">
      <span className="block font-medium text-red-600 dark:text-red-400">
        {formatVnd(product.salePrice)}
        <span className="ml-1.5 text-xs">−{product.discountPercent}%</span>
      </span>
      <s className="text-xs text-admin-muted">{formatVnd(product.price)}</s>
    </span>
  );
}

function Thumb({ product }: { product: Product }) {
  return product.image ? (
    // URL tuỳ ý (có thể là link ngoài) nên dùng img thường.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image}
      alt=""
      loading="lazy"
      className="size-12 shrink-0 rounded-lg border border-admin-border object-cover"
    />
  ) : (
    <span className="grid size-12 shrink-0 place-items-center rounded-lg border border-admin-border bg-admin-surface-2 text-admin-muted">
      <BoxIcon className="size-5" />
    </span>
  );
}

/** Mở bán / ngừng bán nhanh ngay trên danh sách. */
function StatusAction({ product }: { product: Product }) {
  const next: ProductStatus =
    product.status === "published" ? "archived" : "published";
  const label = product.status === "published" ? "Ngừng bán" : "Mở bán";

  return (
    <form action={setProductStatusAction}>
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="status" value={next} />
      <button type="submit" className={`${BUTTON.secondary} ${BUTTON_SM}`}>
        {label}
      </button>
    </form>
  );
}

function StockAction({
  product,
  canWrite,
}: {
  product: Product;
  canWrite: boolean;
}) {
  // Không có quyền sửa thì chỉ hiện nhãn, không bấm đổi được.
  if (!canWrite) {
    return product.inStock ? (
      <Badge tone="success">Còn hàng</Badge>
    ) : (
      <Badge tone="danger">Hết hàng</Badge>
    );
  }
  return (
    <form action={toggleProductStockAction}>
      <input type="hidden" name="id" value={product.id} />
      <input
        type="hidden"
        name="inStock"
        value={product.inStock ? "false" : "true"}
      />
      <button
        type="submit"
        title={product.inStock ? "Đánh dấu hết hàng" : "Đánh dấu còn hàng"}
        className="cursor-pointer"
      >
        {product.inStock ? (
          <Badge tone="success">Còn hàng</Badge>
        ) : (
          <Badge tone="danger">Hết hàng</Badge>
        )}
      </button>
    </form>
  );
}

export default async function AdminProductsPage(
  props: PageProps<"/admin/products">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const rawStatus = pickOne(params.status);
  const status =
    rawStatus && rawStatus in PRODUCT_STATUS_LABELS
      ? (rawStatus as ProductStatus)
      : undefined;
  const rawCategory = Number(pickOne(params.categoryDetailId));
  const categoryDetailId =
    Number.isInteger(rawCategory) && rawCategory > 0 ? rawCategory : undefined;
  const rawSort = pickOne(params.sort);
  const sort = (PRODUCT_SORTS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as ProductSort)
    : "updated-desc";
  const page = Number(pickOne(params.page) ?? 1);

  const [result, categories, all, user] = await Promise.all([
    listProducts({
      search,
      status,
      categoryDetailId,
      sort,
      page: Number.isFinite(page) ? page : 1,
    }),
    listProductCategories(),
    // Ô thống kê nói về toàn hệ thống nên không chịu ảnh hưởng của bộ lọc.
    listProducts({ pageSize: 200 }),
    currentUser(),
  ]);
  // Layout chỉ đòi PRODUCTS.READ — ẩn những nút người xem không dùng được.
  const canWrite = can(user!, "PRODUCTS.WRITE");
  const canPublish = can(user!, "PRODUCTS.PUBLISH");

  const products = result.items;
  const filtered = Boolean(search || status || categoryDetailId);

  const stats = [
    { label: "Sản phẩm", value: all.total },
    { label: "Đang bán", value: all.items.filter((p) => p.live).length },
    {
      label: "Đang khuyến mãi",
      value: all.items.filter((p) => p.discountPercent !== null).length,
    },
    { label: "Hết hàng", value: all.items.filter((p) => !p.inStock).length },
  ];

  const addButton = canWrite ? (
    <Link
      href="/admin/products/new"
      className={`${BUTTON.primary} w-full sm:w-auto`}
    >
      + Thêm sản phẩm
    </Link>
  ) : undefined;

  const emptyState = (
    <EmptyState
      icon={<BoxIcon className="size-6" />}
      title={filtered ? "Không có kết quả" : "Chưa có sản phẩm nào"}
      description={
        filtered
          ? "Thử đổi từ khoá hoặc bỏ bộ lọc."
          : "Thêm sản phẩm đầu tiên để trang Product có nội dung."
      }
      action={filtered ? undefined : addButton}
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sản phẩm"
        description="Sản phẩm hiển thị ở trang Product. Lĩnh vực lấy từ danh mục DM_LINH_VUC_SP."
        action={addButton}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`${CARD} px-4 py-3`}>
            <p className="text-xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 truncate text-xs text-admin-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <FilterBar>
        <Field label="Tìm kiếm" className="sm:min-w-56 sm:flex-1">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Tên hoặc mã sản phẩm"
            className={INPUT}
          />
        </Field>
        <Field label="Lĩnh vực" className="sm:w-52">
          <SearchableSelect
            name="categoryDetailId"
            defaultValue={categoryDetailId ? String(categoryDetailId) : ""}
            options={[
              { value: "", label: "Tất cả" },
              ...categories.map((category) => ({
                value: String(category.id),
                label: category.name,
                hint: `${category.productCount} sp`,
              })),
            ]}
          />
        </Field>
        <Field label="Trạng thái" className="sm:w-40">
          <SearchableSelect
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              ...(Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[]).map(
                (value) => ({ value, label: PRODUCT_STATUS_LABELS[value] }),
              ),
            ]}
          />
        </Field>
        <Field label="Sắp xếp" className="sm:w-44">
          <SearchableSelect
            name="sort"
            defaultValue={sort}
            options={PRODUCT_SORTS.map((value) => ({
              value,
              label: PRODUCT_SORT_LABELS[value],
            }))}
          />
        </Field>
        <div className="flex gap-2">
          <button
            type="submit"
            className={`${BUTTON.primary} flex-1 sm:flex-none`}
          >
            Lọc
          </button>
          {filtered && (
            <Link
              href="/admin/products"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng */}
      <ul className="grid gap-3 md:hidden">
        {products.map((product) => (
          <li key={product.id} className={ROW_CARD}>
            <div className="flex items-start gap-3">
              <Thumb product={product} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="block font-medium"
                >
                  {product.name}
                </Link>
                <p className="mt-0.5 text-xs text-admin-muted">
                  {product.category?.name ?? "—"}
                  {product.sku && ` · ${product.sku}`}
                </p>
              </div>
              {statusBadge(product)}
            </div>

            <div className="flex items-end justify-between gap-3 border-t border-admin-border/60 pt-3 text-sm">
              <PriceCell product={product} />
              <StockAction product={product} canWrite={canWrite} />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/products/${product.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <PencilIcon className="size-3.5" />
                {canWrite ? "Sửa" : "Xem"}
              </Link>
              {canPublish && <StatusAction product={product} />}
              {canWrite && (
                <DeleteButton
                  id={product.id}
                  action={deleteProductAction}
                  confirmText={`Xoá sản phẩm "${product.name}"? Thao tác này không hoàn tác được.`}
                />
              )}
            </div>
          </li>
        ))}
        {products.length === 0 && <li className={CARD}>{emptyState}</li>}
      </ul>

      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Sản phẩm</th>
              <th className={TABLE.th}>Lĩnh vực</th>
              <th className={`${TABLE.th} text-right`}>Giá</th>
              <th className={TABLE.th}>Ra mắt</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}>Kho</th>
              <th className={TABLE.th}>Cập nhật</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className={TABLE.tr}>
                <td className={`${TABLE.td} max-w-sm`}>
                  <div className="flex items-center gap-3">
                    <Thumb product={product} />
                    <div className="min-w-0">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {product.name}
                      </Link>
                      <span className="mt-0.5 block truncate text-xs text-admin-muted">
                        {product.sku ? `${product.sku} · ` : ""}/san-pham/
                        {product.slug}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={TABLE.td}>
                  <span className="text-sm">
                    {product.category?.name ?? "—"}
                  </span>
                </td>
                <td className={`${TABLE.td} text-right whitespace-nowrap`}>
                  <PriceCell product={product} />
                </td>
                <td
                  className={`${TABLE.td} text-admin-muted whitespace-nowrap`}
                >
                  {product.launchedAt
                    ? new Date(product.launchedAt).toLocaleDateString("vi-VN")
                    : "—"}
                </td>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  {statusBadge(product)}
                </td>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  <StockAction product={product} canWrite={canWrite} />
                </td>
                <td
                  className={`${TABLE.td} text-admin-muted whitespace-nowrap`}
                >
                  {formatDateTime(product.updatedAt)}
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/products/${product.id}`}
                      title={canWrite ? "Sửa sản phẩm" : "Xem sản phẩm"}
                      aria-label={canWrite ? "Sửa sản phẩm" : "Xem sản phẩm"}
                      className={ICON_BUTTON}
                    >
                      <PencilIcon className="size-4" />
                    </Link>
                    {canPublish && <StatusAction product={product} />}
                    {canWrite && (
                      <DeleteButton
                        id={product.id}
                        action={deleteProductAction}
                        confirmText={`Xoá sản phẩm "${product.name}"? Thao tác này không hoàn tác được.`}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={8} className="px-0 py-0">
                  {emptyState}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        searchParams={params}
        basePath="/admin/products"
      />
    </div>
  );
}
