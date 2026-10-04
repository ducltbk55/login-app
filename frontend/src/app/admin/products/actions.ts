"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { parseVideoUrl, VIDEO_URL_HINT } from "@/lib/video";
import { BackendError } from "@/lib/backend";
import {
  PRODUCT_STATUSES,
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductStatus,
  type SaveProductInput,
} from "@/lib/products";

export type FormState = { error?: string } | null;

const LIST_PATH = "/admin/products";

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/** Ô giá gửi chuỗi chữ số thuần (xem PriceInput); rỗng = chưa có giá. */
function readPrice(formData: FormData, field: string): number | null {
  const raw = text(formData, field).replace(/\D/g, "");
  return raw === "" ? null : Number(raw);
}

/**
 * Ô bộ sưu tập gửi mảng URL dạng JSON (xem GalleryField). Hỏng thì báo lỗi
 * thay vì lặng lẽ xoá hết ảnh của sản phẩm.
 */
function readGallery(formData: FormData): string[] | { error: string } {
  const raw = text(formData, "gallery");
  if (raw === "") return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
      return value;
    }
  } catch {
    // rơi xuống báo lỗi bên dưới
  }
  return { error: "Bộ sưu tập ảnh không hợp lệ, hãy tải lại trang và thử lại." };
}

/**
 * Ô thông số gửi `[{label, value}]` dạng JSON (xem SpecsField). Kiểm tra
 * độ dài, trùng tên… để backend làm và báo lỗi cụ thể.
 */
function readSpecs(
  formData: FormData,
): { label: string; value: string }[] | { error: string } {
  const raw = text(formData, "specs");
  if (raw === "") return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (
      Array.isArray(value) &&
      value.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as { label?: unknown }).label === "string" &&
          typeof (item as { value?: unknown }).value === "string",
      )
    ) {
      return value as { label: string; value: string }[];
    }
  } catch {
    // rơi xuống báo lỗi bên dưới
  }
  return { error: "Thông số kỹ thuật không hợp lệ, hãy tải lại trang và thử lại." };
}

/**
 * `<input type="date">` gửi "2026-10-03". Ghép 00:00 giờ địa phương rồi đổi
 * sang ISO, để ngày admin chọn cũng là ngày hiện ra — không lệch một ngày vì
 * múi giờ.
 */
function readLaunchedAt(formData: FormData): string | null | { error: string } {
  const raw = text(formData, "launchedAt");
  if (raw === "") return null;

  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return { error: "Ngày ra mắt không hợp lệ." };
  }
  return date.toISOString();
}

function readForm(formData: FormData): SaveProductInput | { error: string } {
  const categoryDetailId = Number(text(formData, "categoryDetailId"));
  if (!Number.isInteger(categoryDetailId) || categoryDetailId <= 0) {
    return { error: "Hãy chọn lĩnh vực cho sản phẩm." };
  }

  const name = text(formData, "name");
  if (name === "") return { error: "Tên sản phẩm không được để trống." };

  const price = readPrice(formData, "price");
  const salePrice = readPrice(formData, "salePrice");
  if (salePrice !== null && price === null) {
    return { error: "Có giá khuyến mãi thì phải nhập giá niêm yết." };
  }
  if (salePrice !== null && price !== null && salePrice >= price) {
    return { error: "Giá khuyến mãi phải thấp hơn giá niêm yết." };
  }

  const launchedAt = readLaunchedAt(formData);
  if (launchedAt !== null && typeof launchedAt === "object") return launchedAt;

  const gallery = readGallery(formData);
  if (!Array.isArray(gallery)) return gallery;

  const specs = readSpecs(formData);
  if (!Array.isArray(specs)) return specs;

  const videoUrl = text(formData, "videoUrl") || null;
  if (videoUrl && !parseVideoUrl(videoUrl)) {
    return { error: `Link video chưa nhúng được. ${VIDEO_URL_HINT}` };
  }

  const rawStatus = text(formData, "status");
  const status = (PRODUCT_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as ProductStatus)
    : "draft";

  return {
    categoryDetailId,
    // Ô slug để trống = nhờ backend sinh từ tên.
    slug: text(formData, "slug") || undefined,
    name,
    sku: text(formData, "sku") || null,
    summary: text(formData, "summary") || null,
    description: text(formData, "description") || null,
    image: text(formData, "image") || null,
    gallery,
    specs,
    videoUrl,
    price,
    salePrice,
    launchedAt,
    status,
    inStock: formData.get("inStock") === "on",
  };
}

/** Lỗi nghiệp vụ hiện trên form thay vì làm vỡ cả trang. */
async function save(
  work: () => Promise<unknown>,
  redirectTo: string,
): Promise<FormState> {
  try {
    await work();
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect(redirectTo);
}

export async function createProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readForm(formData);
  if ("error" in input) return input;

  return save(() => createProduct(input), LIST_PATH);
}

export async function updateProductAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readForm(formData);
  if ("error" in input) return input;

  return save(() => updateProduct(id, input), LIST_PATH);
}

/** Mở bán / ngừng bán nhanh ngay trên danh sách. */
export async function setProductStatusAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const raw = text(formData, "status");
  const status = (PRODUCT_STATUSES as readonly string[]).includes(raw)
    ? (raw as ProductStatus)
    : "draft";

  await updateProduct(text(formData, "id"), { status });
  refresh();
}

/** Bật/tắt còn hàng ngay trên danh sách. */
export async function toggleProductStockAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  await updateProduct(text(formData, "id"), {
    inStock: text(formData, "inStock") === "true",
  });
  refresh();
}

export async function deleteProductAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await deleteProduct(text(formData, "id"));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}
