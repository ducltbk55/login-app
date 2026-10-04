import { ArticleForm } from "@/components/admin/article-form";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { can } from "@/lib/access";
import { requirePermission } from "@/lib/admin";
import { listArticleCategories } from "@/lib/articles";
import { createArticleAction } from "../actions";

export const metadata = { title: "Viết bài mới" };

export default async function NewArticlePage() {
  // Chỉ chuyên mục đang bật — gán bài vào chuyên mục đã tắt thì backend chặn.
  const [admin, categories] = await Promise.all([
    requirePermission("ARTICLES.WRITE"),
    listArticleCategories(),
  ]);

  return (
    <div className="space-y-5">
      <BackLink href="/admin/articles">Danh sách bài viết</BackLink>
      <PageHeader
        title="Viết bài mới"
        description="Lưu ở trạng thái Bản nháp để xem lại trước, chuyển sang Đã xuất bản khi muốn đăng."
      />
      <ArticleForm
        categories={categories}
        defaultAuthor={admin.name ?? undefined}
        canPublish={can(admin, "ARTICLES.PUBLISH")}
        action={createArticleAction}
        cancelHref="/admin/articles"
        submitLabel="Tạo bài viết"
      />
    </div>
  );
}
