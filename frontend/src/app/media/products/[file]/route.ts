import { serveImage } from "@/lib/image-routes";
import { productImage } from "@/lib/products";

/** Ảnh sản phẩm — công khai. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  return serveImage(() => productImage(file));
}
