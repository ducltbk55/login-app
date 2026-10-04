import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleCard, excerptOf } from "@/components/site/article-card";
import {
  findArticleBySlug,
  listArticles,
  recordArticleView,
} from "@/lib/articles";
import { COMPANY_NAME } from "@/lib/company";
import { formatDate } from "@/lib/format";

// Kiểu dáng chuẩn của CKEditor cho ảnh căn lề, bảng, chú thích… để bài ở trang
// ngoài hiển thị giống lúc soạn. Phần chữ chỉnh thêm ở globals.css.
import "ckeditor5/ckeditor5-content.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/tin-tuc/[slug]">,
) {
  const { slug } = await props.params;
  const article = await findArticleBySlug(slug);

  if (!article || !article.live) {
    return { title: "Không tìm thấy bài viết" };
  }

  return {
    title: article.title,
    description: excerptOf(article, 160),
    openGraph: {
      title: article.title,
      description: excerptOf(article, 160),
      type: "article",
      publishedTime: article.publishedAt ?? undefined,
      authors: [article.author],
      images: article.coverImage ? [article.coverImage] : undefined,
      siteName: COMPANY_NAME,
    },
  };
}

export default async function ArticlePage(
  props: PageProps<"/tin-tuc/[slug]">,
) {
  const { slug } = await props.params;
  const article = await findArticleBySlug(slug);

  // `live` chứ không chỉ "tồn tại": bản nháp và bài hẹn giờ không được lộ ra
  // ngoài chỉ vì ai đó đoán đúng đường dẫn.
  if (!article || !article.live) notFound();

  const related = article.category
    ? (
        await listArticles({
          live: true,
          categoryDetailId: article.categoryDetailId,
          pageSize: 4,
        })
      ).items.filter((item) => item.id !== article.id).slice(0, 3)
    : [];

  await recordArticleView(article.slug);

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
          <Link
            href={`/tin-tuc?chuyen-muc=${article.categoryDetailId}`}
            className="text-xs font-semibold tracking-wider text-gold-300 uppercase transition hover:text-gold-200"
          >
            {article.category?.name ?? "Tin tức"}
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>
          {article.summary && (
            <p className="mt-5 text-lg text-white/70">{article.summary}</p>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/55">
            <span className="font-medium text-white/80">{article.author}</span>
            {article.publishedAt && (
              <time dateTime={article.publishedAt}>
                · {formatDate(article.publishedAt)}
              </time>
            )}
            <span>· {article.readingMinutes} phút đọc</span>
          </div>
        </div>
      </section>

      <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
        {article.coverImage && (
          // Ảnh bìa là URL tuỳ ý do admin nhập nên dùng thẻ img thường.
          // Khung cao cố định, ảnh cắt vừa khung: ảnh dọc hay ảnh quá khổ
          // không chiếm trọn màn hình.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.coverImage}
            alt=""
            className="mb-10 h-60 w-full rounded-2xl border border-black/10 object-cover sm:h-96"
          />
        )}

        {/* HTML đã được backend lọc theo allowlist cả lúc lưu lẫn lúc đọc ra
            (backend/src/articles/article-content.ts). */}
        <div
          className="ck-content article-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
        />

        <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-black/10 pt-6 text-sm">
          <p className="text-black/50">
            {article.viewCount + 1} lượt xem · Đăng bởi{" "}
            <span className="font-medium text-black/70">{article.author}</span>
          </p>
          <Link
            href="/tin-tuc"
            className="font-medium text-gold-700 underline-offset-4 transition hover:underline"
          >
            ← Về trang Tin tức
          </Link>
        </footer>
      </article>

      {related.length > 0 && (
        <section className="border-t border-black/10 bg-gold-50/40">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Cùng chuyên mục {article.category?.name}
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <ArticleCard key={item.id} article={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
