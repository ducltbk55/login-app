import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import { ListIcon, PencilIcon, TagIcon } from "@/components/admin/icons";
import { BackLink, Field, FilterBar } from "@/components/admin/page-header";
import { StatusDot } from "@/components/admin/status-dot";
import { Pagination } from "@/components/admin/pagination";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  findCategory,
  listAllCategoryDetails,
  listCategoryDetails,
  type CategoryStatus,
} from "@/lib/categories";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
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
import {
  deleteCategoryDetailAction,
  toggleCategoryDetailAction,
} from "../../actions";

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CategoryDetailsPage(
  props: PageProps<"/admin/categories/[id]/details">,
) {
  const { id } = await props.params;
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const status = pickOne(params.status) as CategoryStatus | undefined;
  const rawGroup = pickOne(params.groupDetailId);
  const groupDetailId = rawGroup ? Number(rawGroup) : undefined;
  const rawPage = Number(pickOne(params.page) ?? 1);

  const [category, user] = await Promise.all([findCategory(id), currentUser()]);
  if (!category) notFound();
  // Layout chỉ đòi CATEGORIES.READ — ẩn những nút người xem không dùng được.
  const canWrite = can(user!, "CATEGORIES.WRITE");

  const groupCategory = category.groupCategoryId
    ? await findCategory(category.groupCategoryId)
    : null;

  const [result, activeOnly, groupOptions] = await Promise.all([
    listCategoryDetails(id, {
      search,
      status,
      groupDetailId: Number.isInteger(groupDetailId)
        ? groupDetailId
        : undefined,
      page: Number.isFinite(rawPage) ? rawPage : 1,
    }),
    // Đếm riêng để con số ở banner nói về cả danh mục, không phải trang hiện tại.
    listCategoryDetails(id, { status: "active", pageSize: 1 }),
    // Danh sách nhóm cho ô lọc; danh mục nhóm thường chỉ vài chục mục.
    groupCategory
      ? listAllCategoryDetails(groupCategory.id, { status: "active" })
      : Promise.resolve([]),
  ]);

  const details = result.items;

  // Gom chi tiết của trang hiện tại theo nhóm để dễ đọc.
  const grouped = groupCategory
    ? [
        ...details
          .reduce((map, detail) => {
            const key = detail.group?.name ?? "Chưa phân nhóm";
            return map.set(key, [...(map.get(key) ?? []), detail]);
          }, new Map<string, typeof details>())
          .entries(),
      ]
    : null;
  const base = `/admin/categories/${encodeURIComponent(id)}`;
  const filtered = Boolean(search || status || groupDetailId);
  const activeCount = activeOnly.total;

  const addButton = canWrite ? (
    <Link
      href={`${base}/details/new`}
      className={`${BUTTON.primary} w-full sm:w-auto`}
    >
      + Thêm chi tiết
    </Link>
  ) : undefined;

  return (
    <div className="space-y-5">
      <BackLink href="/admin/categories">Danh sách danh mục</BackLink>

      {/* Banner xanh: luôn thấy rõ đang đứng trong danh mục nào */}
      <header
        className={`${CARD} overflow-hidden bg-linear-to-br from-brand-700 to-brand-900 p-5 text-white sm:p-6`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <ListIcon className="size-6" />
            </span>
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-semibold tracking-wider text-brand-200 uppercase">
                Chi tiết danh mục
              </p>
              <h2 className="text-lg font-semibold sm:text-xl">
                {category.name}
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs tracking-wide ring-1 ring-white/20">
                  {category.code}
                </code>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                    category.status === "active"
                      ? "bg-emerald-400/20 text-emerald-100 ring-emerald-300/40"
                      : "bg-white/10 text-brand-100 ring-white/20"
                  }`}
                >
                  {category.status === "active" ? "Hoạt động" : "Đã tắt"}
                </span>
                {groupCategory && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs ring-1 ring-white/20">
                    Nhóm theo {groupCategory.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <dl className="grid shrink-0 grid-cols-2 gap-6 text-sm">
              <div>
                <dt className="text-xs text-brand-200">Chi tiết</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {result.total}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-brand-200">Đang bật</dt>
                <dd className="mt-0.5 text-lg font-semibold tabular-nums">
                  {activeCount}
                </dd>
              </div>
            </dl>
            <Link
              href={base}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
            >
              <PencilIcon className="size-4" />
              {canWrite ? "Sửa danh mục" : "Xem danh mục"}
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-admin-muted">
          Mã chi tiết chỉ cần duy nhất trong danh mục này — danh mục khác vẫn
          dùng lại được.
        </p>
        {addButton}
      </div>

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
        {groupCategory && (
          <Field label={groupCategory.name} className="sm:w-60">
            <SearchableSelect
              name="groupDetailId"
              defaultValue={rawGroup ?? ""}
              placeholder="Tất cả"
              searchPlaceholder={`Tìm ${groupCategory.name.toLowerCase()}…`}
              options={[
                { value: "", label: "Tất cả" },
                ...groupOptions.map((option) => ({
                  value: String(option.id),
                  label: option.name,
                  hint: option.code,
                })),
              ]}
            />
          </Field>
        )}
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
              href={`${base}/details`}
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng, khỏi phải cuộn ngang */}
      <ul className="grid gap-3 md:hidden">
        {details.map((detail) => (
          <li key={detail.id} className={ROW_CARD}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{detail.name}</p>
                <code className={`${CODE_CHIP} mt-1 inline-block`}>
                  {detail.code}
                </code>
                {groupCategory && (
                  <p className="mt-1.5 text-xs">
                    <span className="text-admin-muted">
                      {groupCategory.name}:{" "}
                    </span>
                    {detail.group ? (
                      <span className="font-medium">{detail.group.name}</span>
                    ) : (
                      <span className="font-medium text-red-600 dark:text-red-400">
                        Chưa phân nhóm
                      </span>
                    )}
                  </p>
                )}
              </div>
              <StatusDot status={detail.status} />
            </div>

            {detail.descriptions && (
              <p className="line-clamp-2 text-xs text-admin-muted">
                {detail.descriptions}
              </p>
            )}

            <dl className="grid grid-cols-2 gap-2 border-t border-admin-border/60 pt-3 text-xs">
              <div>
                <dt className="text-admin-muted">Thứ tự</dt>
                <dd className="mt-0.5 tabular-nums">{detail.order}</dd>
              </div>
              <div>
                <dt className="text-admin-muted">Cập nhật</dt>
                <dd className="mt-0.5">{formatDateTime(detail.updatedAt)}</dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`${base}/details/${detail.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                {canWrite ? "Sửa" : "Xem"}
              </Link>
              {canWrite && (
                <form action={toggleCategoryDetailAction}>
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="id" value={detail.id} />
                  <input
                    type="hidden"
                    name="status"
                    value={detail.status === "active" ? "inactive" : "active"}
                  />
                  <button
                    type="submit"
                    className={`${BUTTON.secondary} ${BUTTON_SM}`}
                  >
                    {detail.status === "active" ? "Tắt" : "Bật"}
                  </button>
                </form>
              )}
              {canWrite && (
                <DeleteButton
                  id={detail.id}
                  fields={{ categoryId: category.id }}
                  action={deleteCategoryDetailAction}
                  confirmText={`Xoá chi tiết "${detail.name}"?`}
                />
              )}
            </div>
          </li>
        ))}
        {details.length === 0 && (
          <li className={CARD}>
            <EmptyState
              icon={<TagIcon className="size-6" />}
              title={filtered ? "Không có kết quả" : "Chưa có chi tiết nào"}
              description={
                filtered
                  ? "Thử đổi từ khoá hoặc bỏ bộ lọc trạng thái."
                  : `Thêm mục con đầu tiên cho “${category.name}”.`
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
              <th className={`${TABLE.th} text-right`}>Thứ tự</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}>Cập nhật</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {(grouped ?? [[null, details] as const]).flatMap(
              ([groupName, items]) => [
                groupName !== null && (
                  <tr key={`group-${groupName}`} className="bg-admin-surface-2">
                    <td
                      colSpan={7}
                      className="border-b border-admin-border px-4 py-2 text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300"
                    >
                      {groupName}
                      <span className="ml-2 font-normal text-admin-muted normal-case">
                        ({items.length})
                      </span>
                    </td>
                  </tr>
                ),
                ...items.map((detail) => (
                  <tr key={detail.id} className={TABLE.tr}>
                    <td className={TABLE.td}>
                      <code className={CODE_CHIP}>{detail.code}</code>
                    </td>
                    <td className={`${TABLE.td} max-w-xl`}>
                      <Link
                        href={`${base}/details/${detail.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {detail.name}
                      </Link>
                      {detail.descriptions && (
                        <span className="line-clamp-1 text-xs text-admin-muted">
                          {detail.descriptions}
                        </span>
                      )}
                    </td>
                    <td className={`${TABLE.td} text-right tabular-nums`}>
                      {detail.order}
                    </td>
                    <td className={TABLE.td}>
                      <StatusDot status={detail.status} />
                    </td>
                    <td
                      className={`${TABLE.td} text-admin-muted whitespace-nowrap`}
                    >
                      {formatDateTime(detail.updatedAt)}
                    </td>
                    <td className={TABLE.td}>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`${base}/details/${detail.id}`}
                          title={canWrite ? "Sửa chi tiết" : "Xem chi tiết"}
                          aria-label={
                            canWrite ? "Sửa chi tiết" : "Xem chi tiết"
                          }
                          className={ICON_BUTTON}
                        >
                          <PencilIcon className="size-4" />
                        </Link>
                        {canWrite && (
                          <form action={toggleCategoryDetailAction}>
                            <input
                              type="hidden"
                              name="categoryId"
                              value={category.id}
                            />
                            <input type="hidden" name="id" value={detail.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={
                                detail.status === "active"
                                  ? "inactive"
                                  : "active"
                              }
                            />
                            <button
                              type="submit"
                              className={`${BUTTON.secondary} ${BUTTON_SM}`}
                            >
                              {detail.status === "active" ? "Tắt" : "Bật"}
                            </button>
                          </form>
                        )}
                        {canWrite && (
                          <DeleteButton
                            id={detail.id}
                            fields={{ categoryId: category.id }}
                            action={deleteCategoryDetailAction}
                            confirmText={`Xoá chi tiết "${detail.name}"?`}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                )),
              ],
            )}
            {details.length === 0 && (
              <tr>
                <td colSpan={6} className="px-0 py-0">
                  <EmptyState
                    icon={<TagIcon className="size-6" />}
                    title={
                      filtered ? "Không có kết quả" : "Chưa có chi tiết nào"
                    }
                    description={
                      filtered
                        ? "Thử đổi từ khoá hoặc bỏ bộ lọc trạng thái."
                        : `Thêm mục con đầu tiên cho “${category.name}”.`
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
        basePath={`${base}/details`}
      />
    </div>
  );
}
