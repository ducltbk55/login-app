import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import {
  BriefcaseIcon,
  CalendarIcon,
  IdCardIcon,
  PencilIcon,
} from "@/components/admin/icons";
import { Field, FilterBar, PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { BatchStatusBadge } from "@/components/admin/recruitment-status";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import {
  BATCH_STATUS_LABELS,
  BATCH_STATUSES,
  formatDay,
  listBatches,
  type Batch,
  type BatchStatus,
} from "@/lib/recruitment";
import {
  BUTTON,
  BUTTON_SM,
  CARD,
  ICON_BUTTON,
  INPUT,
  ROW_CARD,
  TABLE,
} from "@/lib/styles";
import { deleteBatchAction, setBatchStatusAction } from "./actions";

export const metadata = { title: "Tuyển dụng" };

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Nút chuyển nhanh: nháp/đã đóng → mở, đang mở → đóng. */
function QuickStatus({ batch }: { batch: Batch }) {
  const next: BatchStatus = batch.status === "open" ? "closed" : "open";
  return (
    <form action={setBatchStatusAction}>
      <input type="hidden" name="id" value={batch.id} />
      <input type="hidden" name="status" value={next} />
      <button
        type="submit"
        className={`${BUTTON.secondary} ${BUTTON_SM} whitespace-nowrap`}
      >
        {next === "open" ? "Mở đợt" : "Đóng đợt"}
      </button>
    </form>
  );
}

export default async function AdminRecruitmentPage(
  props: PageProps<"/admin/recruitment">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const status = pickOne(params.status) as BatchStatus | undefined;
  const page = Number(pickOne(params.page) ?? 1);

  const [result, user] = await Promise.all([
    listBatches({ search, status, page: Number.isFinite(page) ? page : 1 }),
    currentUser(),
  ]);
  const canWrite = can(user!, "RECRUITMENT.WRITE");
  const canSeeCandidates = can(user!, "CANDIDATES.READ");

  const batches = result.items;
  const filtered = Boolean(search || status);
  const deleteText = (batch: Batch) =>
    `Xoá đợt "${batch.name}"? Chỉ xoá được đợt chưa có vị trí nào.`;

  const empty = (
    <EmptyState
      icon={<BriefcaseIcon className="size-6" />}
      title={filtered ? "Không có kết quả" : "Chưa có đợt tuyển dụng nào"}
      description={
        filtered
          ? "Thử đổi từ khoá hoặc bỏ bộ lọc trạng thái."
          : "Tạo một đợt, thêm các vị trí cần tuyển rồi mở đợt để nhận hồ sơ."
      }
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đợt tuyển dụng"
        description="Mỗi đợt gồm các vị trí cần tuyển. Trang Tuyển dụng chỉ nhận hồ sơ khi đợt Đang mở và trong khoảng ngày của đợt."
        action={
          canWrite ? (
            <Link
              href="/admin/recruitment/new"
              className={`${BUTTON.primary} w-full sm:w-auto`}
            >
              Tạo đợt tuyển dụng
            </Link>
          ) : undefined
        }
      />

      <FilterBar>
        <Field label="Tìm kiếm" className="sm:min-w-56 sm:flex-1">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Tên hoặc mô tả đợt"
            className={INPUT}
          />
        </Field>
        <Field label="Trạng thái" className="sm:w-48">
          <SearchableSelect
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              ...BATCH_STATUSES.map((value) => ({
                value,
                label: BATCH_STATUS_LABELS[value],
              })),
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
              href="/admin/recruitment"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng */}
      <ul className="grid gap-3 md:hidden">
        {batches.map((batch) => (
          <li key={batch.id} className={ROW_CARD}>
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/admin/recruitment/${batch.id}`}
                className="min-w-0 font-medium"
              >
                {batch.name}
              </Link>
              <BatchStatusBadge batch={batch} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-admin-muted">
              <CalendarIcon className="size-3.5" />
              {formatDay(batch.startDate)} – {formatDay(batch.endDate)}
            </p>
            <p className="text-sm text-admin-muted">
              {batch.jobCount} vị trí · {batch.candidateCount} hồ sơ
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/recruitment/${batch.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <PencilIcon className="size-3.5" />
                Mở
              </Link>
              {canWrite && <QuickStatus batch={batch} />}
              {canWrite && (
                <DeleteButton
                  id={batch.id}
                  action={deleteBatchAction}
                  confirmText={deleteText(batch)}
                />
              )}
            </div>
          </li>
        ))}
        {batches.length === 0 && <li className={CARD}>{empty}</li>}
      </ul>

      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Đợt tuyển dụng</th>
              <th className={TABLE.th}>Thời gian</th>
              <th className={`${TABLE.th} text-right`}>Vị trí</th>
              <th className={`${TABLE.th} text-right`}>Hồ sơ</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id} className={TABLE.tr}>
                <td className={`${TABLE.td} max-w-sm`}>
                  <Link
                    href={`/admin/recruitment/${batch.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {batch.name}
                  </Link>
                  {batch.description && (
                    <span className="line-clamp-1 text-xs text-admin-muted">
                      {batch.description}
                    </span>
                  )}
                </td>
                <td
                  className={`${TABLE.td} whitespace-nowrap text-admin-muted`}
                >
                  {formatDay(batch.startDate)} – {formatDay(batch.endDate)}
                </td>
                <td className={`${TABLE.td} text-right tabular-nums`}>
                  {batch.jobCount}
                </td>
                <td className={`${TABLE.td} text-right tabular-nums`}>
                  {canSeeCandidates && batch.candidateCount > 0 ? (
                    <Link
                      href={`/admin/candidates?batchId=${batch.id}`}
                      className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
                    >
                      {batch.candidateCount}
                    </Link>
                  ) : (
                    batch.candidateCount
                  )}
                </td>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  <BatchStatusBadge batch={batch} />
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center justify-end gap-2">
                    {canWrite && <QuickStatus batch={batch} />}
                    {canSeeCandidates && (
                      <Link
                        href={`/admin/candidates?batchId=${batch.id}`}
                        title="Ứng viên của đợt"
                        aria-label="Ứng viên của đợt"
                        className={ICON_BUTTON}
                      >
                        <IdCardIcon className="size-4" />
                      </Link>
                    )}
                    <Link
                      href={`/admin/recruitment/${batch.id}`}
                      title="Mở đợt"
                      aria-label="Mở đợt"
                      className={ICON_BUTTON}
                    >
                      <PencilIcon className="size-4" />
                    </Link>
                    {canWrite && (
                      <DeleteButton
                        id={batch.id}
                        action={deleteBatchAction}
                        confirmText={deleteText(batch)}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={6} className="px-0 py-0">
                  {empty}
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
        basePath="/admin/recruitment"
      />
    </div>
  );
}
