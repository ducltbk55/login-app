import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { Badge } from "@/components/badge";
import { listCategories } from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import { BUTTON, INPUT, TABLE } from "@/lib/styles";
import { deleteCategoryAction, toggleCategoryAction } from "./actions";

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCategoriesPage(
  props: PageProps<"/admin/categories">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const activeFilter = pickOne(params.isActive);

  const categories = await listCategories({
    search,
    isActive: activeFilter === undefined ? undefined : activeFilter === "true",
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Danh mục</h2>
          <p className="text-sm opacity-60">
            Slug là duy nhất, dùng cho URL. Thứ tự nhỏ hiện trước.
          </p>
        </div>
        <Link href="/admin/categories/new" className={BUTTON.primary}>
          + Thêm danh mục
        </Link>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1.5 block font-medium opacity-70">Tìm kiếm</span>
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Tên hoặc slug (bỏ dấu cũng được)"
            className={`${INPUT} sm:w-72`}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1.5 block font-medium opacity-70">
            Trạng thái
          </span>
          <select
            name="isActive"
            defaultValue={activeFilter ?? ""}
            className={INPUT}
          >
            <option value="">Tất cả</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã tắt</option>
          </select>
        </label>
        <button type="submit" className={BUTTON.secondary}>
          Lọc
        </button>
        {(search || activeFilter) && (
          <Link href="/admin/categories" className={BUTTON.secondary}>
            Xoá lọc
          </Link>
        )}
      </form>

      <p className="text-sm opacity-60">{categories.length} bản ghi</p>

      <div className={TABLE.wrapper}>
        <table className={TABLE.table}>
          <thead>
            <tr>
              <th className={TABLE.th}>Tên</th>
              <th className={TABLE.th}>Slug</th>
              <th className={TABLE.th}>Thứ tự</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}>Cập nhật</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td className={TABLE.td}>
                  <span className="block font-medium">{category.name}</span>
                  {category.description && (
                    <span className="block text-xs opacity-60">
                      {category.description}
                    </span>
                  )}
                </td>
                <td className={TABLE.td}>
                  <code className="text-xs opacity-70">{category.slug}</code>
                </td>
                <td className={`${TABLE.td} tabular-nums`}>
                  {category.sortOrder}
                </td>
                <td className={TABLE.td}>
                  <Badge tone={category.isActive ? "success" : "neutral"}>
                    {category.isActive ? "hoạt động" : "đã tắt"}
                  </Badge>
                </td>
                <td className={TABLE.td}>
                  {formatDateTime(category.updatedAt)}
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/categories/${category.id}`}
                      className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
                    >
                      Sửa
                    </Link>
                    <form action={toggleCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={String(!category.isActive)}
                      />
                      <button
                        type="submit"
                        className={`${BUTTON.secondary} px-3 py-1 text-xs`}
                      >
                        {category.isActive ? "Tắt" : "Bật"}
                      </button>
                    </form>
                    <DeleteButton
                      id={category.id}
                      action={deleteCategoryAction}
                      confirmText={`Xoá danh mục "${category.name}"?`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className={TABLE.empty}>
                  Chưa có danh mục nào khớp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
