import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import { ListIcon, PencilIcon, TagIcon } from "@/components/admin/icons";
import { Field, FilterBar, PageHeader } from "@/components/admin/page-header";
import { StatusDot } from "@/components/admin/status-dot";
import { Pagination } from "@/components/admin/pagination";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  listAllCategories,
  listCategories,
  type CategoryStatus,
} from "@/lib/categories";
import { formatDateTime } from "@/lib/format";
import {
  BUTTON,
  BUTTON_SM,
  CARD,
  CODE_CHIP,
  ICON_BUTTON,
  INPUT,
  ROW_CARD,
  TABLE,
} from "@/lib/styles";
import { deleteCategoryAction, toggleCategoryAction } from "./actions";

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCategoriesPage(
  props: PageProps<"/admin/categories">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const status = pickOne(params.status) as CategoryStatus | undefined;
  const page = Number(pickOne(params.page) ?? 1);

  const [result, all] = await Promise.all([
    listCategories({ search, status, page: Number.isFinite(page) ? page : 1 }),
    // Ô thống kê nói về toàn bộ hệ thống nên không chịu ảnh hưởng của bộ lọc
    // lẫn phân trang.
    listAllCategories(),
  ]);
  const categories = result.items;
  const filtered = Boolean(search || status);

  const stats = [
    { label: "Danh mục", value: all.length },
    {
      label: "Đang hoạt động",
      value: all.filter((c) => c.status === "active").length,
    },
    {
      label: "Đã tắt",
      value: all.filter((c) => c.status !== "active").length,
    },
    {
      label: "Tổng chi tiết",
      value: all.reduce((sum, c) => sum + c.detailCount, 0),
    },
  ];

  const addButton = (
    <Link
      href="/admin/categories/new"
      className={`${BUTTON.primary} w-full sm:w-auto`}
    >
      + Thêm danh mục
    </Link>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Danh mục"
        description="Mã danh mục là duy nhất trong toàn hệ thống. Mỗi danh mục có danh sách chi tiết riêng."
        action={addButton}
      />

      {/* Thống kê tính từ danh sách đã tải, không gọi thêm request nào */}
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
            placeholder="Tên hoặc mã (bỏ dấu cũng được)"
            className={INPUT}
          />
        </Field>
        <Field label="Trạng thái" className="sm:w-48">
          <SearchableSelect
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              { value: "active", label: "Đang hoạt động" },
              { value: "inactive", label: "Đã tắt" },
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
              href="/admin/categories"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng, khỏi phải cuộn ngang */}
      <ul className="grid gap-3 md:hidden">
        {categories.map((category) => (
          <li key={category.id} className={ROW_CARD}>
            <div className="flex items-start justify-between gap-3">
              <Link href={`/admin/categories/${category.id}`} className="min-w-0">
                <p className="font-medium">{category.name}</p>
                <code className={`${CODE_CHIP} mt-1 inline-block`}>
                  {category.code}
                </code>
              </Link>
              <StatusDot status={category.status} />
            </div>

            {category.descriptions && (
              <p className="line-clamp-2 text-xs text-admin-muted">
                {category.descriptions}
              </p>
            )}

            {category.groupCategory && (
              <p className="text-xs text-admin-muted">
                Nhóm theo{" "}
                <span className="font-medium text-admin-text">
                  {category.groupCategory.name}
                </span>
              </p>
            )}

            <dl className="grid grid-cols-3 gap-2 border-t border-admin-border/60 pt-3 text-xs">
              <div>
                <dt className="text-admin-muted">Thứ tự</dt>
                <dd className="mt-0.5 tabular-nums">{category.order}</dd>
              </div>
              <div>
                <dt className="text-admin-muted">Chi tiết</dt>
                <dd className="mt-0.5 tabular-nums">{category.detailCount}</dd>
              </div>
              <div>
                <dt className="text-admin-muted">Cập nhật</dt>
                <dd className="mt-0.5">{formatDateTime(category.updatedAt)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/categories/${category.id}/details`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <ListIcon className="size-3.5" />
                Chi tiết
              </Link>
              <Link
                href={`/admin/categories/${category.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <PencilIcon className="size-3.5" />
                Sửa
              </Link>
              <form action={toggleCategoryAction}>
                <input type="hidden" name="id" value={category.id} />
                <input
                  type="hidden"
                  name="status"
                  value={category.status === "active" ? "inactive" : "active"}
                />
                <button
                  type="submit"
                  className={`${BUTTON.secondary} ${BUTTON_SM}`}
                >
                  {category.status === "active" ? "Tắt" : "Bật"}
                </button>
              </form>
              <DeleteButton
                id={category.id}
                action={deleteCategoryAction}
                confirmText={`Xoá danh mục "${category.name}"? ${category.detailCount} chi tiết bên trong sẽ bị xoá theo.`}
              />
            </div>
          </li>
        ))}
        {categories.length === 0 && (
          <li className={CARD}>
            <EmptyState
              icon={<TagIcon className="size-6" />}
              title={filtered ? "Không có kết quả" : "Chưa có danh mục nào"}
              description={
                filtered
                  ? "Thử đổi từ khoá hoặc bỏ bộ lọc trạng thái."
                  : "Tạo danh mục đầu tiên để bắt đầu."
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
              <th className={TABLE.th}>Mã</th>
              <th className={TABLE.th}>Tên</th>
              <th className={TABLE.th}>Nhóm theo</th>
              <th className={`${TABLE.th} text-right`}>Thứ tự</th>
              <th className={`${TABLE.th} text-right`}>Chi tiết</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}>Cập nhật</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className={TABLE.tr}>
                <td className={TABLE.td}>
                  <code className={CODE_CHIP}>{category.code}</code>
                </td>
                <td className={`${TABLE.td} max-w-xl`}>
                  <Link
                    href={`/admin/categories/${category.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {category.name}
                  </Link>
                  {category.descriptions && (
                    <span className="line-clamp-1 text-xs text-admin-muted">
                      {category.descriptions}
                    </span>
                  )}
                </td>
                <td className={TABLE.td}>
                  {category.groupCategory ? (
                    <Link
                      href={`/admin/categories/${category.groupCategory.id}/details`}
                      className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
                    >
                      {category.groupCategory.name}
                    </Link>
                  ) : (
                    <span className="text-sm text-admin-muted">—</span>
                  )}
                </td>
                <td className={`${TABLE.td} text-right tabular-nums`}>
                  {category.order}
                </td>
                <td className={`${TABLE.td} text-right`}>
                  <Link
                    href={`/admin/categories/${category.id}/details`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 tabular-nums transition hover:text-brand-800 dark:text-brand-300"
                  >
                    {category.detailCount}
                  </Link>
                </td>
                <td className={TABLE.td}>
                  <StatusDot status={category.status} />
                </td>
                <td className={`${TABLE.td} text-admin-muted whitespace-nowrap`}>
                  {formatDateTime(category.updatedAt)}
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center justify-end gap-2">
                    {/* Icon list: mở danh sách chi tiết của riêng danh mục này */}
                    <Link
                      href={`/admin/categories/${category.id}/details`}
                      title="Xem chi tiết danh mục"
                      aria-label="Xem chi tiết danh mục"
                      className={ICON_BUTTON}
                    >
                      <ListIcon className="size-4" />
                    </Link>
                    <Link
                      href={`/admin/categories/${category.id}`}
                      title="Sửa danh mục"
                      aria-label="Sửa danh mục"
                      className={ICON_BUTTON}
                    >
                      <PencilIcon className="size-4" />
                    </Link>
                    <form action={toggleCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={
                          category.status === "active" ? "inactive" : "active"
                        }
                      />
                      <button
                        type="submit"
                        className={`${BUTTON.secondary} ${BUTTON_SM}`}
                      >
                        {category.status === "active" ? "Tắt" : "Bật"}
                      </button>
                    </form>
                    <DeleteButton
                      id={category.id}
                      action={deleteCategoryAction}
                      confirmText={`Xoá danh mục "${category.name}"? ${category.detailCount} chi tiết bên trong sẽ bị xoá theo.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={8} className="px-0 py-0">
                  <EmptyState
                    icon={<TagIcon className="size-6" />}
                    title={
                      filtered ? "Không có kết quả" : "Chưa có danh mục nào"
                    }
                    description={
                      filtered
                        ? "Thử đổi từ khoá hoặc bỏ bộ lọc trạng thái."
                        : "Tạo danh mục đầu tiên để bắt đầu."
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
        basePath="/admin/categories"
      />
    </div>
  );
}
