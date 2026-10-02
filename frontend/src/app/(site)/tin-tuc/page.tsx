import Link from "next/link";

import {
  ArticleCard,
  FeaturedArticleCard,
} from "@/components/site/article-card";
import { listArticleCategories, listArticles } from "@/lib/articles";
import { COMPANY_NAME } from "@/lib/company";

export const metadata = {
  title: "Tin Tức",
  description: `Tin tức, hoạt động và góc công nghệ của ${COMPANY_NAME}.`,
};

/** Tin bài đổi liên tục nên không cache ở tầng route. */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 9;

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewsPage(props: PageProps<"/tin-tuc">) {
  const params = await props.searchParams;

  const rawCategory = Number(pickOne(params["chuyen-muc"]));
  const categoryDetailId =
    Number.isInteger(rawCategory) && rawCategory > 0 ? rawCategory : undefined;
  const rawPage = Number(pickOne(params.page) ?? 1);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;

  const [result, categories] = await Promise.all([
    // `live` để backend quyết định thế nào là "đang lên sóng" — bài nháp và
    // bài hẹn giờ đều không lọt ra đây.
    listArticles({ live: true, categoryDetailId, page, pageSize: PAGE_SIZE }),
    listArticleCategories(true),
  ]);

  const articles = result.items;
  const active = categories.find((c) => c.id === categoryDetailId);
  const total = categories.reduce((sum, c) => sum + c.articleCount, 0);

  // Khối nổi bật chỉ ở trang đầu: sang trang 2 mà vẫn thấy nó thì rối.
  const showFeature = page === 1 && articles.length > 0;
  const [featured, ...rest] = showFeature ? articles : [];
  const grid = showFeature ? rest : articles;

  const href = (next: Record<string, string | number | undefined>) => {
    const query = new URLSearchParams();
    const category = next["chuyen-muc"] ?? categoryDetailId;
    if (category) query.set("chuyen-muc", String(category));
    if (next.page && Number(next.page) > 1) query.set("page", String(next.page));
    return query.size > 0 ? `/tin-tuc?${query}` : "/tin-tuc";
  };

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Tin Tức
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {active ? active.name : "Tin tức & hoạt động"}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            {active
              ? `${active.articleCount} bài trong chuyên mục này.`
              : "Cập nhật về sản phẩm, dự án, khách hàng và công nghệ."}
          </p>
        </div>
      </section>

      {/* Dải chuyên mục dính dưới header, cuộn ngang được khi màn hình hẹp */}
      <nav
        aria-label="Chuyên mục"
        className="sticky top-16 z-10 border-b border-black/10 bg-white/85 backdrop-blur"
      >
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <ul className="flex gap-2 overflow-x-auto py-3">
            <li>
              <Link
                href={href({ "chuyen-muc": undefined, page: 1 })}
                aria-current={active ? undefined : "page"}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "text-black/60 hover:bg-black/5"
                    : "bg-ink-900 text-white"
                }`}
              >
                Tất cả
                <span className="text-xs opacity-60">{total}</span>
              </Link>
            </li>
            {categories.map((category) => {
              const current = category.id === categoryDetailId;
              return (
                <li key={category.id}>
                  <Link
                    href={href({ "chuyen-muc": category.id, page: 1 })}
                    aria-current={current ? "page" : undefined}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                      current
                        ? "bg-ink-900 text-white"
                        : "text-black/60 hover:bg-black/5"
                    }`}
                  >
                    {category.name}
                    <span className="text-xs opacity-60">
                      {category.articleCount}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        {articles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/15 px-6 py-20 text-center">
            <p className="text-lg font-medium">
              {active
                ? `Chuyên mục "${active.name}" chưa có bài nào.`
                : "Chưa có bài viết nào được đăng."}
            </p>
            <p className="mt-2 text-sm text-black/55">
              Hãy quay lại sau, chúng tôi đang chuẩn bị nội dung.
            </p>
            {active && (
              <Link
                href="/tin-tuc"
                className="mt-6 inline-flex rounded-lg bg-ink-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
              >
                Xem tất cả tin
              </Link>
            )}
          </div>
        ) : (
          <>
            {featured && <FeaturedArticleCard article={featured} />}

            {grid.length > 0 && (
              <div
                className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${
                  featured ? "mt-8" : ""
                }`}
              >
                {grid.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </>
        )}

        {result.totalPages > 1 && (
          <nav
            aria-label="Phân trang"
            className="mt-12 flex items-center justify-center gap-2"
          >
            {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(
              (number) => (
                <Link
                  key={number}
                  href={href({ page: number })}
                  aria-current={number === result.page ? "page" : undefined}
                  className={`grid h-9 min-w-9 place-items-center rounded-lg px-3 text-sm font-medium tabular-nums transition ${
                    number === result.page
                      ? "bg-ink-900 text-white"
                      : "border border-black/10 text-black/60 hover:border-gold-400 hover:text-gold-700"
                  }`}
                >
                  {number}
                </Link>
              ),
            )}
          </nav>
        )}
      </section>
    </>
  );
}
