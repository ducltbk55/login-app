import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import { NewspaperIcon, PencilIcon } from "@/components/admin/icons";
import { Field, FilterBar, PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { Badge } from "@/components/badge";
import {
  ARTICLE_STATUS_LABELS,
  listArticleCategories,
  listArticles,
  type Article,
  type ArticleStatus,
} from "@/lib/articles";
import { formatDateTime } from "@/lib/format";
import {
  BUTTON,
  BUTTON_SM,
  CARD,
  ICON_BUTTON,
  INPUT,
  ROW_CARD,
  TABLE,
} from "@/lib/styles";
import {
  deleteArticleAction,
  setArticleStatusAction,
  toggleArticleFeaturedAction,
} from "./actions";

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Nhãn trạng thái thực tế, không chỉ cột `status`.
 *
 * Bài `published` mà chưa tới giờ đăng vẫn chưa ai đọc được — nếu chỉ hiện
 * "Đã xuất bản" thì admin sẽ tưởng bài đang trên trang chủ và không hiểu sao
 * không thấy. Nên tách riêng một nhãn "Hẹn giờ".
 */
function statusBadge(article: Article) {
  if (article.status === "published" && !article.live) {
    return <Badge tone="info">Hẹn giờ</Badge>;
  }
  const tone =
    article.status === "published"
      ? "success"
      : article.status === "archived"
        ? "danger"
        : "neutral";
  return <Badge tone={tone}>{ARTICLE_STATUS_LABELS[article.status]}</Badge>;
}

/** Nút đổi trạng thái nhanh ngay trên danh sách. */
function StatusAction({ article }: { article: Article }) {
  const next: ArticleStatus =
    article.status === "published" ? "archived" : "published";
  const label = article.status === "published" ? "Gỡ xuống" : "Xuất bản";

  return (
    <form action={setArticleStatusAction}>
      <input type="hidden" name="id" value={article.id} />
      <input type="hidden" name="status" value={next} />
      <button type="submit" className={`${BUTTON.secondary} ${BUTTON_SM}`}>
        {label}
      </button>
    </form>
  );
}

function FeaturedAction({ article }: { article: Article }) {
  return (
    <form action={toggleArticleFeaturedAction}>
      <input type="hidden" name="id" value={article.id} />
      <input
        type="hidden"
        name="featured"
        value={article.featured ? "false" : "true"}
      />
      <button
        type="submit"
        title={article.featured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
        aria-label={article.featured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
        className={`${ICON_BUTTON} ${
          article.featured ? "border-gold-400 text-gold-600" : ""
        }`}
      >
        {article.featured ? "★" : "☆"}
      </button>
    </form>
  );
}

export default async function AdminArticlesPage(
  props: PageProps<"/admin/articles">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const status = pickOne(params.status) as ArticleStatus | undefined;
  const rawCategory = Number(pickOne(params.categoryDetailId));
  const categoryDetailId = Number.isInteger(rawCategory) && rawCategory > 0
    ? rawCategory
    : undefined;
  const page = Number(pickOne(params.page) ?? 1);

  const [result, categories, all] = await Promise.all([
    listArticles({
      search,
      status,
      categoryDetailId,
      page: Number.isFinite(page) ? page : 1,
    }),
    listArticleCategories(),
    // Ô thống kê nói về toàn hệ thống nên không chịu ảnh hưởng của bộ lọc.
    listArticles({ pageSize: 200 }),
  ]);

  const articles = result.items;
  const filtered = Boolean(search || status || categoryDetailId);

  const stats = [
    { label: "Bài viết", value: all.total },
    {
      label: "Đang hiển thị",
      value: all.items.filter((a) => a.live).length,
    },
    {
      label: "Bản nháp",
      value: all.items.filter((a) => a.status === "draft").length,
    },
    { label: "Chuyên mục", value: categories.length },
  ];

  const addButton = (
    <Link
      href="/admin/articles/new"
      className={`${BUTTON.primary} w-full sm:w-auto`}
    >
      + Viết bài mới
    </Link>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bài viết"
        description="Tin bài hiển thị ở trang Tin tức. Chuyên mục lấy từ danh mục DM_CHUYEN_MUC."
        action={addButton}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`${CARD} px-4 py-3`}>
            <p className="text-xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-0.5 truncate text-xs text-admin-muted">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      <FilterBar>
        <Field label="Tìm kiếm" className="sm:min-w-56 sm:flex-1">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Tiêu đề, tóm tắt hoặc tác giả"
            className={INPUT}
          />
        </Field>
        <Field label="Chuyên mục" className="sm:w-52">
          <SearchableSelect
            name="categoryDetailId"
            defaultValue={categoryDetailId ? String(categoryDetailId) : ""}
            options={[
              { value: "", label: "Tất cả" },
              ...categories.map((category) => ({
                value: String(category.id),
                label: category.name,
                hint: `${category.articleCount} bài`,
              })),
            ]}
          />
        </Field>
        <Field label="Trạng thái" className="sm:w-44">
          <SearchableSelect
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              { value: "published", label: "Đã xuất bản" },
              { value: "draft", label: "Bản nháp" },
              { value: "archived", label: "Lưu trữ" },
            ]}
          />
        </Field>
        <div className="flex gap-2">
          <button
            type="submit"
            className={`${BUTTON.primary} flex-1 sm:flex-none`}
          >
            Lọc
          </button>
          {filtered && (
            <Link
              href="/admin/articles"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng */}
      <ul className="grid gap-3 md:hidden">
        {articles.map((article) => (
          <li key={article.id} className={ROW_CARD}>
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/admin/articles/${article.id}`}
                className="min-w-0 font-medium"
              >
                {article.featured && <span className="text-gold-600">★ </span>}
                {article.title}
              </Link>
              {statusBadge(article)}
            </div>

            <p className="text-xs text-admin-muted">
              {article.category?.name ?? "—"} · {article.author}
            </p>

            <dl className="grid grid-cols-3 gap-2 border-t border-admin-border/60 pt-3 text-xs">
              <div>
                <dt className="text-admin-muted">Ngày đăng</dt>
                <dd className="mt-0.5">
                  {article.publishedAt
                    ? formatDateTime(article.publishedAt)
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-admin-muted">Lượt xem</dt>
                <dd className="mt-0.5 tabular-nums">{article.viewCount}</dd>
              </div>
              <div>
                <dt className="text-admin-muted">Phút đọc</dt>
                <dd className="mt-0.5 tabular-nums">
                  {article.readingMinutes}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/articles/${article.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <PencilIcon className="size-3.5" />
                Sửa
              </Link>
              <StatusAction article={article} />
              <FeaturedAction article={article} />
              <DeleteButton
                id={article.id}
                action={deleteArticleAction}
                confirmText={`Xoá bài "${article.title}"? Thao tác này không hoàn tác được.`}
              />
            </div>
          </li>
        ))}
        {articles.length === 0 && (
          <li className={CARD}>
            <EmptyState
              icon={<NewspaperIcon className="size-6" />}
              title={filtered ? "Không có kết quả" : "Chưa có bài viết nào"}
              description={
                filtered
                  ? "Thử đổi từ khoá hoặc bỏ bộ lọc."
                  : "Viết bài đầu tiên để trang Tin tức có nội dung."
              }
              action={filtered ? undefined : addButton}
            />
          </li>
        )}
      </ul>

      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={`${TABLE.th} w-10`}></th>
              <th className={TABLE.th}>Tiêu đề</th>
              <th className={TABLE.th}>Chuyên mục</th>
              <th className={TABLE.th}>Tác giả</th>
              <th className={TABLE.th}>Ngày đăng</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={`${TABLE.th} text-right`}>Xem</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id} className={TABLE.tr}>
                <td className={TABLE.td}>
                  <FeaturedAction article={article} />
                </td>
                <td className={`${TABLE.td} max-w-md`}>
                  <Link
                    href={`/admin/articles/${article.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {article.title}
                  </Link>
                  <span className="mt-0.5 block text-xs text-admin-muted">
                    /tin-tuc/{article.slug} · {article.readingMinutes} phút đọc
                  </span>
                </td>
                <td className={TABLE.td}>
                  {article.category ? (
                    <span className="text-sm">{article.category.name}</span>
                  ) : (
                    <span className="text-sm text-admin-muted">—</span>
                  )}
                </td>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  {article.author}
                </td>
                <td
                  className={`${TABLE.td} text-admin-muted whitespace-nowrap`}
                >
                  {article.publishedAt
                    ? formatDateTime(article.publishedAt)
                    : "—"}
                </td>
                <td className={TABLE.td}>{statusBadge(article)}</td>
                <td className={`${TABLE.td} text-right tabular-nums`}>
                  {article.viewCount}
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/articles/${article.id}`}
                      title="Sửa bài viết"
                      aria-label="Sửa bài viết"
                      className={ICON_BUTTON}
                    >
                      <PencilIcon className="size-4" />
                    </Link>
                    <StatusAction article={article} />
                    <DeleteButton
                      id={article.id}
                      action={deleteArticleAction}
                      confirmText={`Xoá bài "${article.title}"? Thao tác này không hoàn tác được.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={8} className="px-0 py-0">
                  <EmptyState
                    icon={<NewspaperIcon className="size-6" />}
                    title={
                      filtered ? "Không có kết quả" : "Chưa có bài viết nào"
                    }
                    description={
                      filtered
                        ? "Thử đổi từ khoá hoặc bỏ bộ lọc."
                        : "Viết bài đầu tiên để trang Tin tức có nội dung."
                    }
                    action={filtered ? undefined : addButton}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
        searchParams={params}
        basePath="/admin/articles"
      />
    </div>
  );
}
