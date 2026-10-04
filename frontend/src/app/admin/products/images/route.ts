import { handleImageUpload } from "@/lib/image-routes";
import { productImageUrl, uploadProductImage } from "@/lib/products";

/** Ảnh sản phẩm và ảnh chèn trong mô tả (CKEditor) tải lên. */
export async function POST(request: Request) {
  return handleImageUpload(
    request,
    uploadProductImage,
    productImageUrl,
    "PRODUCTS.WRITE",
  );
}
