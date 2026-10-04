import Link from "next/link";
import { notFound } from "next/navigation";

import { ExternalIcon } from "@/components/admin/icons";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import {
  findProduct,
  listProductCategories,
  listSpecLabels,
} from "@/lib/products";
import { BUTTON } from "@/lib/styles";
import { updateProductAction } from "../actions";

export default async function EditProductPage(
  props: PageProps<"/admin/products/[id]">,
) {
  const { id } = await props.params;
  const [product, categories, specSuggestions, user] = await Promise.all([
    findProduct(id),
    listProductCategories(),
    listSpecLabels(),
    currentUser(),
  ]);

  if (!product) notFound();
  // Layout đã đòi PRODUCTS.READ; thiếu WRITE thì vẫn xem được nhưng chỉ đọc.
  const canWrite = can(user!, "PRODUCTS.WRITE");

  // Lĩnh vực của sản phẩm có thể đã bị tắt sau khi tạo. Không ghép vào danh
  // sách thì ô chọn hiện trống và admin vô tình đổi lĩnh vực khi bấm lưu.
  const options = categories.some((c) => c.id === product.categoryDetailId)
    ? categories
    : [
        ...categories,
        {
          id: product.categoryDetailId,
          code: product.category?.code ?? "",
          name: `${product.category?.name ?? "Lĩnh vực cũ"} (đã tắt)`,
          productCount: 0,
        },
      ];

  return (
    <div className="space-y-5">
      <BackLink href="/admin/products">Danh sách sản phẩm</BackLink>

      <PageHeader
        title={canWrite ? `Sửa: ${product.name}` : product.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>Tạo lúc {formatDateTime(product.createdAt)}</span>
            <span>· Cập nhật {formatDateTime(product.updatedAt)}</span>
          </span>
        }
        action={
          product.live ? (
            <Link
              href={`/san-pham/${product.slug}`}
              target="_blank"
              className={`${BUTTON.secondary} w-full sm:w-auto`}
            >
              <ExternalIcon className="size-4" />
              Xem trên trang
            </Link>
          ) : undefined
        }
      />

      {/* bind id vào action để form chỉ cần (state, formData) */}
      <ProductForm
        record={product}
        categories={options}
        specSuggestions={specSuggestions}
        action={updateProductAction.bind(null, product.id)}
        cancelHref="/admin/products"
        submitLabel="Lưu thay đổi"
        readOnly={!canWrite}
        canPublish={can(user!, "PRODUCTS.PUBLISH")}
      />
    </div>
  );
}
