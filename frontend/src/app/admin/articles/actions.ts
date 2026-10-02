"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdmin } from "@/lib/admin";
import { BackendError } from "@/lib/backend";
import {
  ARTICLE_STATUSES,
  createArticle,
  deleteArticle,
  updateArticle,
  type ArticleStatus,
  type SaveArticleInput,
} from "@/lib/articles";

export type FormState = { error?: string } | null;

const LIST_PATH = "/admin/articles";

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/**
 * `datetime-local` gửi lên dạng "2026-10-02T14:30" — không có múi giờ, trình
 * duyệt hiểu là giờ địa phương. `new Date()` cũng diễn giải đúng như vậy rồi
 * đổi sang ISO, nên giờ admin nhìn thấy chính là giờ bài được đăng.
 */
function readPublishedAt(formData: FormData): string | null | { error: string } {
  const raw = text(formData, "publishedAt");
  if (raw === "") return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { error: "Ngày xuất bản không hợp lệ." };
  }
  return date.toISOString();
}

function readForm(formData: FormData): SaveArticleInput | { error: string } {
  const categoryDetailId = Number(text(formData, "categoryDetailId"));
  if (!Number.isInteger(categoryDetailId) || categoryDetailId <= 0) {
    return { error: "Hãy chọn chuyên mục cho bài viết." };
  }

  const title = text(formData, "title");
  if (title === "") return { error: "Tiêu đề không được để trống." };

  const content = text(formData, "content");
  if (content === "") return { error: "Nội dung không được để trống." };

  const author = text(formData, "author");
  if (author === "") return { error: "Tác giả không được để trống." };

  const publishedAt = readPublishedAt(formData);
  if (publishedAt !== null && typeof publishedAt === "object") {
    return publishedAt;
  }

  const rawStatus = text(formData, "status");
  const status = (ARTICLE_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as ArticleStatus)
    : "draft";

  return {
    categoryDetailId,
    // Ô slug để trống = nhờ backend sinh từ tiêu đề.
    slug: text(formData, "slug") || undefined,
    title,
    summary: text(formData, "summary") || null,
    content,
    coverImage: text(formData, "coverImage") || null,
    author,
    publishedAt,
    status,
    featured: formData.get("featured") === "on",
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

export async function createArticleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readForm(formData);
  if ("error" in input) return input;

  return save(() => createArticle(input), LIST_PATH);
}

export async function updateArticleAction(
  id: number,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  const input = readForm(formData);
  if ("error" in input) return input;

  return save(() => updateArticle(id, input), LIST_PATH);
}

/**
 * Đổi trạng thái nhanh từ danh sách. Dùng cho cả xuất bản, gỡ về lưu trữ và
 * đưa lại về nháp — nút nào gửi giá trị nấy.
 */
export async function setArticleStatusAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  const raw = text(formData, "status");
  const status = (ARTICLE_STATUSES as readonly string[]).includes(raw)
    ? (raw as ArticleStatus)
    : "draft";

  await updateArticle(id, { status });
  refresh();
}

/** Bật/tắt "nổi bật" ngay trên danh sách. */
export async function toggleArticleFeaturedAction(
  formData: FormData,
): Promise<void> {
  await requireAdmin();

  await updateArticle(text(formData, "id"), {
    featured: text(formData, "featured") === "true",
  });
  refresh();
}

export async function deleteArticleAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();

  try {
    await deleteArticle(text(formData, "id"));
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  return null;
}
