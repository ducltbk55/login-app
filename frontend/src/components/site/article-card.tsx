import Link from "next/link";

import type { Article } from "@/lib/articles";
import { formatDate } from "@/lib/format";

/**
 * Bài chưa có sapo thì lấy tạm đoạn đầu nội dung — danh sách tin mà chỉ có
 * tiêu đề thì rất khó quyết định có bấm vào hay không.
 */
export function excerptOf(article: Article, limit = 180): string {
  if (article.summary) return article.summary;

  const text = article.content.replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit).trimEnd()}…` : text;
}

/** Khối ảnh bìa; không có ảnh thì dựng nền gradient theo chữ cái đầu. */
function Cover({
  article,
  className,
}: {
  article: Article;
  className: string;
}) {
  if (article.coverImage) {
    return (
      // Ảnh do admin dán URL bất kỳ nên không qua next/image (cần cấu hình
      // từng domain). Thẻ img thường chấp nhận được cho ảnh bìa tin.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={article.coverImage}
        alt=""
        loading="lazy"
        className={`${className} object-cover`}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={`${className} grid place-items-center bg-gradient-to-br from-ink-900 via-ink-800 to-gold-800`}
    >
      <span className="text-4xl font-semibold text-gold-300/70">
        {article.title.trim().charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export function ArticleMeta({
  article,
  className = "",
}: {
  article: Article;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ${className}`}
    >
      {article.category && (
        <span className="rounded-full bg-gold-100 px-2.5 py-0.5 font-medium text-gold-800">
          {article.category.name}
        </span>
      )}
      {article.publishedAt && (
        <time dateTime={article.publishedAt}>
          {formatDate(article.publishedAt)}
        </time>
      )}
      <span>· {article.readingMinutes} phút đọc</span>
    </div>
  );
}

/** Bài nổi bật: ảnh lớn bên trái, nội dung bên phải trên màn hình rộng. */
export function FeaturedArticleCard({ article }: { article: Article }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-black/10 bg-white shadow-sm transition hover:shadow-lg">
      <Link href={`/tin-tuc/${article.slug}`} className="grid lg:grid-cols-2">
        <Cover article={article} className="h-56 w-full lg:h-full lg:min-h-72" />
        <div className="flex flex-col justify-center p-7 sm:p-10">
          <ArticleMeta article={article} className="text-black/50" />
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-balance transition group-hover:text-gold-700 sm:text-3xl">
            {article.title}
          </h2>
          <p className="mt-3 text-black/65">{excerptOf(article, 260)}</p>
          <p className="mt-5 text-sm font-medium text-gold-700">
            Đọc tiếp →
          </p>
        </div>
      </Link>
    </article>
  );
}

export function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-lg">
      <Link href={`/tin-tuc/${article.slug}`} className="flex flex-1 flex-col">
        <Cover article={article} className="h-44 w-full" />
        <div className="flex flex-1 flex-col p-6">
          <ArticleMeta article={article} className="text-black/50" />
          <h3 className="mt-3 text-lg font-semibold text-balance transition group-hover:text-gold-700">
            {article.title}
          </h3>
          <p className="mt-2 flex-1 text-sm text-black/60">
            {excerptOf(article)}
          </p>
          <p className="mt-4 text-xs text-black/40">{article.author}</p>
        </div>
      </Link>
    </article>
  );
}
