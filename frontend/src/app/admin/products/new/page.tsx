import { ProductForm } from "@/components/admin/product-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { requireAdmin } from "@/lib/admin";
import { listProductCategories, listSpecLabels } from "@/lib/products";
import { createProductAction } from "../actions";

export const metadata = { title: "Thêm sản phẩm" };

export default async function NewProductPage() {
  // Chỉ lĩnh vực đang bật — gán vào lĩnh vực đã tắt thì backend chặn.
  const [, categories, specSuggestions] = await Promise.all([
    requireAdmin(),
    listProductCategories(),
    listSpecLabels(),
  ]);

  return (
    <div className="space-y-5">
      <BackLink href="/admin/products">Danh sách sản phẩm</BackLink>
      <PageHeader
        title="Thêm sản phẩm"
        description="Lưu ở trạng thái Bản nháp để xem lại trước, chuyển sang Đang bán khi muốn hiện ở trang Product."
      />
      <ProductForm
        categories={categories}
        specSuggestions={specSuggestions}
        action={createProductAction}
        cancelHref="/admin/products"
        submitLabel="Tạo sản phẩm"
      />
    </div>
  );
}
