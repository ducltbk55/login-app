import { COMPANY_NAME } from "@/lib/company";
import { formatDate } from "@/lib/format";
import { NEWS } from "@/lib/site-content";

export const metadata = {
  title: "Tin Tức",
  description: `Tin tức và hoạt động của ${COMPANY_NAME}.`,
};

export default function NewsPage() {
  const [featured, ...rest] = NEWS;

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Tin Tức
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Tin tức &amp; hoạt động
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Cập nhật về sản phẩm, dự án và đời sống tại công ty.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Bài nổi bật chiếm trọn chiều ngang để dẫn mắt */}
        <article className="rounded-3xl border border-black/10 bg-gold-50/60 p-8 sm:p-12">
          <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
            <span className="rounded-full bg-gold-200/70 px-2.5 py-0.5 font-medium text-gold-800">
              {featured.category}
            </span>
            <time dateTime={featured.publishedAt}>
              {formatDate(featured.publishedAt)}
            </time>
            <span>· {featured.readingMinutes} phút đọc</span>
          </div>
          <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {featured.title}
          </h2>
          <p className="mt-4 max-w-2xl text-black/70">{featured.excerpt}</p>
        </article>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {rest.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-2xl border border-black/10 bg-white p-6 transition hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-lg"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-black/50">
                <span className="rounded-full bg-gold-100 px-2.5 py-0.5 font-medium text-gold-800">
                  {post.category}
                </span>
                <time dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt)}
                </time>
              </div>
              <h3 className="mt-3 text-lg font-semibold text-balance">
                {post.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-black/60">
                {post.excerpt}
              </p>
              <p className="mt-4 text-xs text-black/40">
                {post.readingMinutes} phút đọc
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
