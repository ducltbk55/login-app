import { listProducts } from "@/lib/products";

/**
 * Thông tin hiện hành của các sản phẩm trong giỏ: `GET /api/cart?ids=3,7`.
 *
 * Giỏ trên trình duyệt chỉ giữ id + số lượng, nên giá luôn lấy ở đây — khách
 * không thấy giá cũ sau khi hết khuyến mãi, và không sửa được giá bằng cách
 * chỉnh localStorage. Chỉ trả sản phẩm đang bán và đúng các trường cần hiện.
 */
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0)
    .slice(0, 100);

  if (ids.length === 0) return Response.json({ items: [] });

  const { items } = await listProducts({ live: true, ids, pageSize: 100 });

  return Response.json(
    {
      items: items.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        image: p.image,
        price: p.price,
        salePrice: p.salePrice,
        effectivePrice: p.effectivePrice,
        discountPercent: p.discountPercent,
        inStock: p.inStock,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
