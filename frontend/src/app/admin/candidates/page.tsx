import Link from "next/link";

import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import {
  IdCardIcon,
  ListIcon,
  PaperclipIcon,
} from "@/components/admin/icons";
import { Field, FilterBar, PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { CandidateStatusBadge } from "@/components/admin/recruitment-status";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import {
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_STATUSES,
  getCandidateStats,
  listBatches,
  listCandidates,
  listJobs,
  type Candidate,
  type CandidateStatus,
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
import { deleteCandidateAction } from "./actions";

export const metadata = { title: "Ứng viên" };

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positiveInt(value: string | undefined): number | undefined {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export default async function AdminCandidatesPage(
  props: PageProps<"/admin/candidates">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const rawStatus = pickOne(params.status) ?? "";
  const status = (CANDIDATE_STATUSES as readonly string[]).includes(rawStatus)
    ? (rawStatus as CandidateStatus)
    : undefined;
  const batchId = positiveInt(pickOne(params.batchId));
  const jobId = positiveInt(pickOne(params.jobId));
  const page = Number(pickOne(params.page) ?? 1);

  const [result, stats, batches, jobs, user] = await Promise.all([
    listCandidates({
      search,
      status,
      batchId,
      jobId,
      page: Number.isFinite(page) ? page : 1,
    }),
    getCandidateStats(batchId),
    listBatches({ pageSize: 200 }),
    // Chọn đợt thì ô vị trí chỉ còn vị trí của đợt đó.
    listJobs({ batchId, pageSize: 200 }),
    currentUser(),
  ]);
  const canWrite = can(user!, "CANDIDATES.WRITE");

  const candidates = result.items;
  const filtered = Boolean(search || status || batchId || jobId);

  // Ô thống kê giữ bộ lọc đợt đang chọn, chỉ đổi trạng thái.
  const tileHref = (next?: CandidateStatus) => {
    const query = new URLSearchParams();
    if (batchId) query.set("batchId", String(batchId));
    if (next) query.set("status", next);
    return query.size ? `/admin/candidates?${query}` : "/admin/candidates";
  };
  const tiles = [
    { label: "Tất cả hồ sơ", value: stats.total, href: tileHref() },
    {
      label: "Mới nộp, chưa xem",
      value: stats.pending,
      href: tileHref("new"),
      alert: stats.pending > 0,
    },
    {
      label: "Đang phỏng vấn",
      value: stats.interview,
      href: tileHref("interview"),
    },
    { label: "Đã tuyển", value: stats.hired, href: tileHref("hired") },
  ];

  const deleteText = (candidate: Candidate) =>
    `Xoá hồ sơ của "${candidate.fullName}"? CV trên máy chủ cũng bị xoá và không khôi phục được.`;

  const empty = (
    <EmptyState
      icon={<IdCardIcon className="size-6" />}
      title={filtered ? "Không có kết quả" : "Chưa có hồ sơ nào"}
      description={
        filtered
          ? "Thử đổi từ khoá hoặc bỏ bớt bộ lọc."
          : "Hồ sơ ứng viên nộp từ trang Tuyển dụng sẽ hiện ở đây."
      }
    />
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ứng viên"
        description="Hồ sơ nộp từ trang Tuyển dụng. CV chỉ xem được ở đây, không có đường dẫn công khai."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className={`${CARD} px-4 py-3 transition hover:border-brand-300 ${
              tile.alert ? "border-red-500/40 bg-red-500/[0.04]" : ""
            }`}
          >
            <p
              className={`text-xl font-semibold tabular-nums ${
                tile.alert ? "text-red-600 dark:text-red-400" : ""
              }`}
            >
              {tile.value}
            </p>
            <p className="mt-0.5 truncate text-xs text-admin-muted">
              {tile.label}
            </p>
          </Link>
        ))}
      </section>

      <FilterBar>
        <Field label="Tìm kiếm" className="sm:min-w-56 sm:flex-1">
          <input
            type="search"
            name="search"
            defaultValue={search}
            placeholder="Tên, email, số điện thoại, vị trí"
            className={INPUT}
          />
        </Field>
        <Field label="Đợt tuyển dụng" className="sm:w-56">
          <SearchableSelect
            name="batchId"
            defaultValue={batchId ? String(batchId) : ""}
            options={[
              { value: "", label: "Tất cả đợt" },
              ...batches.items.map((batch) => ({
                value: String(batch.id),
                label: batch.name,
              })),
            ]}
          />
        </Field>
        <Field label="Vị trí" className="sm:w-56">
          <SearchableSelect
            name="jobId"
            defaultValue={jobId ? String(jobId) : ""}
            options={[
              { value: "", label: "Tất cả vị trí" },
              ...jobs.items.map((job) => ({
                value: String(job.id),
                label: job.title,
                hint: batchId ? undefined : job.batch.name,
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
              ...CANDIDATE_STATUSES.map((value) => ({
                value,
                label: CANDIDATE_STATUS_LABELS[value],
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
              href="/admin/candidates"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng */}
      <ul className="grid gap-3 md:hidden">
        {candidates.map((candidate) => (
          <li key={candidate.id} className={ROW_CARD}>
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/admin/candidates/${candidate.id}`}
                className="min-w-0 font-medium"
              >
                {candidate.fullName}
              </Link>
              <CandidateStatusBadge status={candidate.status} />
            </div>
            <p className="truncate text-xs text-admin-muted">
              {candidate.email} · {candidate.phone}
            </p>
            <p className="text-sm font-medium">{candidate.job.title}</p>
            <p className="text-xs text-admin-muted">
              {candidate.batch.name} · {formatDateTime(candidate.createdAt)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/candidates/${candidate.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <ListIcon className="size-3.5" />
                Xem hồ sơ
              </Link>
              <Link
                href={`/admin/candidates/${candidate.id}/cv`}
                target="_blank"
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <PaperclipIcon className="size-3.5" />
                CV
              </Link>
              {canWrite && (
                <DeleteButton
                  id={candidate.id}
                  action={deleteCandidateAction}
                  confirmText={deleteText(candidate)}
                />
              )}
            </div>
          </li>
        ))}
        {candidates.length === 0 && <li className={CARD}>{empty}</li>}
      </ul>

      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Ứng viên</th>
              <th className={TABLE.th}>Vị trí ứng tuyển</th>
              <th className={TABLE.th}>CV</th>
              <th className={TABLE.th}>Nộp lúc</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => (
              <tr key={candidate.id} className={TABLE.tr}>
                <td className={TABLE.td}>
                  <Link
                    href={`/admin/candidates/${candidate.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {candidate.fullName}
                  </Link>
                  <span className="block text-xs text-admin-muted">
                    {candidate.email}
                  </span>
                  <span className="block text-xs text-admin-muted">
                    {candidate.phone}
                    {candidate.experience
                      ? ` · Kinh nghiệm: ${candidate.experience}`
                      : ""}
                  </span>
                </td>
                <td className={`${TABLE.td} min-w-52`}>
                  <span className="block font-medium">
                    {candidate.job.title}
                  </span>
                  <span className="block text-xs text-admin-muted">
                    {candidate.batch.name}
                  </span>
                </td>
                <td className={TABLE.td}>
                  <Link
                    href={`/admin/candidates/${candidate.id}/cv`}
                    target="_blank"
                    title={candidate.cv.name}
                    className="inline-flex max-w-32 items-center gap-1.5 text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
                  >
                    <PaperclipIcon className="size-4 shrink-0" />
                    <span className="truncate">{candidate.cv.name}</span>
                  </Link>
                </td>
                <td className={`${TABLE.td} text-xs text-admin-muted`}>
                  {formatDateTime(candidate.createdAt)}
                </td>
                <td className={`${TABLE.td} whitespace-nowrap`}>
                  <CandidateStatusBadge status={candidate.status} />
                  {candidate.status === "interview" &&
                    candidate.interviewAt && (
                      <span className="mt-1 block text-xs text-admin-muted">
                        {formatDateTime(candidate.interviewAt)}
                      </span>
                    )}
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/candidates/${candidate.id}`}
                      title="Xem hồ sơ"
                      aria-label="Xem hồ sơ"
                      className={ICON_BUTTON}
                    >
                      <ListIcon className="size-4" />
                    </Link>
                    {canWrite && (
                      <DeleteButton
                        id={candidate.id}
                        action={deleteCandidateAction}
                        confirmText={deleteText(candidate)}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {candidates.length === 0 && (
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
        basePath="/admin/candidates"
      />
    </div>
  );
}
