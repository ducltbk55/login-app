import { request, requestOptional, requestStream, segment } from "./backend";
import type { Paginated, PageQuery } from "./categories";

/** `draft` chưa từng đăng, `archived` đã đăng rồi gỡ xuống. */
export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

export type ArticleCategoryRef = { id: number; code: string; name: string };

/** Chuyên mục kèm số bài, dùng cho ô chọn và dải lọc ở trang Tin tức. */
export type ArticleCategory = ArticleCategoryRef & { articleCount: number };

export type Article = {
  id: number;
  categoryDetailId: number;
  category: ArticleCategoryRef | null;
  slug: string;
  title: string;
  summary: string | null;
  content: string;
  coverImage: string | null;
  author: string;
  publishedAt: string | null;
  status: ArticleStatus;
  featured: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  /** Suy ra từ độ dài nội dung. */
  readingMinutes: number;
  /** Đang hiển thị ở trang ngoài: đã xuất bản VÀ tới giờ đăng. */
  live: boolean;
};

export type SaveArticleInput = {
  categoryDetailId?: number;
  slug?: string;
  title?: string;
  summary?: string | null;
  content?: string;
  coverImage?: string | null;
  author?: string;
  publishedAt?: string | null;
  status?: ArticleStatus;
  featured?: boolean;
};

export type ArticleQuery = PageQuery & {
  search?: string;
  status?: ArticleStatus;
  categoryDetailId?: number;
  /** Chỉ bài đang lên sóng — trang Tin tức luôn bật cờ này. */
  live?: boolean;
  featured?: boolean;
};

function toQueryString(query: ArticleQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.categoryDetailId !== undefined) {
    params.set("categoryDetailId", String(query.categoryDetailId));
  }
  if (query.live !== undefined) params.set("live", String(query.live));
  if (query.featured !== undefined) {
    params.set("featured", String(query.featured));
  }
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }
  return params.size > 0 ? `?${params}` : "";
}

export async function listArticles(
  query: ArticleQuery = {},
): Promise<Paginated<Article>> {
  return request<Paginated<Article>>(`/articles${toQueryString(query)}`);
}

export async function findArticle(
  id: string | number,
): Promise<Article | null> {
  return requestOptional<Article>(`/articles/${segment(id)}`);
}

export async function findArticleBySlug(
  slug: string,
): Promise<Article | null> {
  return requestOptional<Article>(`/articles/slug/${segment(slug)}`);
}

/**
 * Chuyên mục đang bật. `live` = chỉ đếm bài đang lên sóng (trang ngoài),
 * bỏ qua = đếm tất cả (trang quản trị).
 */
export async function listArticleCategories(
  live = false,
): Promise<ArticleCategory[]> {
  return request<ArticleCategory[]>(`/articles/categories?live=${live}`);
}

/** Số bài theo từng chuyên mục, khoá là id chi tiết danh mục. */
export async function articleCountsByCategory(
  live = false,
): Promise<Record<number, number>> {
  return request<Record<number, number>>(`/articles/counts?live=${live}`);
}

export async function createArticle(
  input: SaveArticleInput,
): Promise<Article> {
  return request<Article>("/articles", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateArticle(
  id: string | number,
  input: SaveArticleInput,
): Promise<Article> {
  return request<Article>(`/articles/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteArticle(id: string | number): Promise<void> {
  await request<null>(`/articles/${segment(id)}`, { method: "DELETE" });
}

/**
 * Đếm lượt xem. Lỗi ở đây không được làm hỏng trang bài viết — đọc được bài
 * quan trọng hơn con số thống kê.
 */
export async function recordArticleView(slug: string): Promise<void> {
  try {
    await request<null>(`/articles/slug/${segment(slug)}/views`, {
      method: "POST",
    });
  } catch {
    // bỏ qua có chủ đích
  }
}

/** Đường dẫn công khai của ảnh trong bài — xem app/media/articles/[file]. */
export function articleImageUrl(file: string): string {
  return `/media/articles/${encodeURIComponent(file)}`;
}

/** Gửi ảnh lên backend, nhận về tên file đã lưu. */
export async function uploadArticleImage(image: File): Promise<string> {
  const body = new FormData();
  body.set("upload", image, image.name);
  const { file } = await request<{ file: string }>("/articles/images", {
    method: "POST",
    body,
  });
  return file;
}

export async function articleImage(file: string): Promise<Response> {
  return requestStream(`/articles/images/${segment(file)}`);
}
