import Link from "next/link";
import { notFound } from "next/navigation";

import { ArticleForm } from "@/components/admin/article-form";
import { ExternalIcon } from "@/components/admin/icons";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { findArticle, listArticleCategories } from "@/lib/articles";
import { formatDateTime } from "@/lib/format";
import { BUTTON } from "@/lib/styles";
import { updateArticleAction } from "../actions";

export default async function EditArticlePage(
  props: PageProps<"/admin/articles/[id]">,
) {
  const { id } = await props.params;
  const [article, categories, user] = await Promise.all([
    findArticle(id),
    listArticleCategories(),
    currentUser(),
  ]);

  if (!article) notFound();
  // Layout đã đòi ARTICLES.READ; thiếu WRITE thì vẫn xem được nhưng chỉ đọc.
  const canWrite = can(user!, "ARTICLES.WRITE");

  // Chuyên mục của bài có thể đã bị tắt sau khi bài được tạo. Nếu không ghép
  // nó vào danh sách thì ô chọn sẽ hiện trống và admin vô tình đổi chuyên mục
  // chỉ vì mở trang sửa rồi bấm lưu.
  const options = categories.some((c) => c.id === article.categoryDetailId)
    ? categories
    : [
        ...categories,
        {
          id: article.categoryDetailId,
          code: article.category?.code ?? "",
          name: `${article.category?.name ?? "Chuyên mục cũ"} (đã tắt)`,
          articleCount: 0,
        },
      ];

  return (
    <div className="space-y-5">
      <BackLink href="/admin/articles">Danh sách bài viết</BackLink>

      <PageHeader
        title={canWrite ? `Sửa: ${article.title}` : article.title}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>Tạo lúc {formatDateTime(article.createdAt)}</span>
            <span>· Cập nhật {formatDateTime(article.updatedAt)}</span>
            <span>· {article.viewCount} lượt xem</span>
          </span>
        }
        action={
          article.live ? (
            <Link
              href={`/tin-tuc/${article.slug}`}
              target="_blank"
              className={`${BUTTON.secondary} w-full sm:w-auto`}
            >
              <ExternalIcon className="size-4" />
              Xem trên trang
            </Link>
          ) : undefined
        }
      />

      {/* bind id vào action để form chỉ cần (state, formData) */}
      <ArticleForm
        record={article}
        categories={options}
        action={updateArticleAction.bind(null, article.id)}
        cancelHref="/admin/articles"
        submitLabel="Lưu thay đổi"
        readOnly={!canWrite}
        canPublish={can(user!, "ARTICLES.PUBLISH")}
      />
    </div>
  );
}
