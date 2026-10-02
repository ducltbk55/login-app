import Link from "next/link";

import {
  ContactStatusBadge,
  ContactStatusButtons,
} from "@/components/admin/contact-status";
import { DeleteButton } from "@/components/admin/delete-button";
import { EmptyState } from "@/components/admin/empty-state";
import { ListIcon, MailIcon, PaperclipIcon } from "@/components/admin/icons";
import { Field, FilterBar, PageHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  CONTACT_STATUS_LABELS,
  formatBytes,
  getContactStats,
  listContacts,
  type ContactStatus,
} from "@/lib/contacts";
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
import { deleteContactAction, setContactStatusAction } from "./actions";

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminContactsPage(
  props: PageProps<"/admin/contacts">,
) {
  const params = await props.searchParams;
  const search = pickOne(params.search) ?? "";
  const status = pickOne(params.status) as ContactStatus | undefined;
  const page = Number(pickOne(params.page) ?? 1);

  const [result, stats] = await Promise.all([
    listContacts({ search, status, page: Number.isFinite(page) ? page : 1 }),
    getContactStats(),
  ]);

  const contacts = result.items;
  const filtered = Boolean(search || status);

  const tiles = [
    { label: "Tất cả", value: stats.total, href: "/admin/contacts" },
    {
      label: "Chưa xử lý",
      value: stats.pending,
      href: "/admin/contacts?status=new",
      alert: stats.pending > 0,
    },
    {
      label: "Đang xử lý",
      value: stats.inProgress,
      href: "/admin/contacts?status=in_progress",
    },
    {
      label: "Đã xử lý",
      value: stats.resolved,
      href: "/admin/contacts?status=resolved",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Liên hệ"
        description="Yêu cầu gửi từ trang Liên hệ. Tệp đính kèm chỉ xem được ở đây, không có đường dẫn công khai."
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
            placeholder="Tên, email, chủ đề hoặc nội dung"
            className={INPUT}
          />
        </Field>
        <Field label="Trạng thái" className="sm:w-48">
          <SearchableSelect
            name="status"
            defaultValue={status ?? ""}
            options={[
              { value: "", label: "Tất cả" },
              ...(
                Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[]
              ).map((value) => ({
                value,
                label: CONTACT_STATUS_LABELS[value],
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
              href="/admin/contacts"
              className={`${BUTTON.secondary} flex-1 sm:flex-none`}
            >
              Xoá lọc
            </Link>
          )}
        </div>
      </FilterBar>

      {/* Mobile: thẻ thay cho hàng bảng */}
      <ul className="grid gap-3 md:hidden">
        {contacts.map((contact) => (
          <li key={contact.id} className={ROW_CARD}>
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/admin/contacts/${contact.id}`}
                className="min-w-0 font-medium"
              >
                {contact.name}
              </Link>
              <ContactStatusBadge status={contact.status} />
            </div>

            <p className="truncate text-xs text-admin-muted">{contact.email}</p>
            {contact.subject && (
              <p className="text-sm font-medium">{contact.subject}</p>
            )}
            <p className="line-clamp-2 text-sm text-admin-muted">
              {contact.message}
            </p>

            {contact.attachment && (
              <p className="flex items-center gap-1.5 text-xs text-brand-700 dark:text-brand-300">
                <PaperclipIcon className="size-3.5" />
                {contact.attachment.name} (
                {formatBytes(contact.attachment.size)})
              </p>
            )}

            <p className="text-xs text-admin-muted">
              {formatDateTime(contact.createdAt)}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/contacts/${contact.id}`}
                className={`${BUTTON.secondary} ${BUTTON_SM}`}
              >
                <ListIcon className="size-3.5" />
                Xem
              </Link>
              <DeleteButton
                id={contact.id}
                action={deleteContactAction}
                confirmText={`Xoá liên hệ của "${contact.name}"? Tệp đính kèm cũng bị xoá theo.`}
              />
            </div>
          </li>
        ))}
        {contacts.length === 0 && (
          <li className={CARD}>
            <EmptyState
              icon={<MailIcon className="size-6" />}
              title={filtered ? "Không có kết quả" : "Chưa có liên hệ nào"}
              description={
                filtered
                  ? "Thử đổi từ khoá hoặc bỏ bộ lọc trạng thái."
                  : "Yêu cầu gửi từ trang Liên hệ sẽ hiện ở đây."
              }
            />
          </li>
        )}
      </ul>

      <div className={`${TABLE.wrapper} hidden md:block`}>
        <table className={TABLE.table}>
          <thead className={TABLE.thead}>
            <tr>
              <th className={TABLE.th}>Người gửi</th>
              <th className={TABLE.th}>Nội dung</th>
              <th className={TABLE.th}>Đính kèm</th>
              <th className={TABLE.th}>Gửi lúc</th>
              <th className={TABLE.th}>Trạng thái</th>
              <th className={TABLE.th}></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr key={contact.id} className={TABLE.tr}>
                <td className={TABLE.td}>
                  <Link
                    href={`/admin/contacts/${contact.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {contact.name}
                  </Link>
                  <span className="block text-xs text-admin-muted">
                    {contact.email}
                  </span>
                </td>
                <td className={`${TABLE.td} max-w-md`}>
                  {contact.subject && (
                    <span className="block font-medium">{contact.subject}</span>
                  )}
                  <span className="line-clamp-1 text-xs text-admin-muted">
                    {contact.message}
                  </span>
                </td>
                <td className={TABLE.td}>
                  {contact.attachment ? (
                    <Link
                      href={`/admin/contacts/${contact.id}/attachment`}
                      target="_blank"
                      title={contact.attachment.name}
                      className="inline-flex max-w-40 items-center gap-1.5 text-sm font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
                    >
                      <PaperclipIcon className="size-4 shrink-0" />
                      <span className="truncate">{contact.attachment.name}</span>
                    </Link>
                  ) : (
                    <span className="text-sm text-admin-muted">—</span>
                  )}
                </td>
                <td
                  className={`${TABLE.td} text-admin-muted whitespace-nowrap`}
                >
                  {formatDateTime(contact.createdAt)}
                </td>
                <td className={TABLE.td}>
                  <ContactStatusBadge status={contact.status} />
                </td>
                <td className={TABLE.td}>
                  <div className="flex items-center justify-end gap-2">
                    <ContactStatusButtons
                      id={contact.id}
                      current={contact.status}
                      action={setContactStatusAction}
                    />
                    <Link
                      href={`/admin/contacts/${contact.id}`}
                      title="Xem chi tiết"
                      aria-label="Xem chi tiết"
                      className={ICON_BUTTON}
                    >
                      <ListIcon className="size-4" />
                    </Link>
                    <DeleteButton
                      id={contact.id}
                      action={deleteContactAction}
                      confirmText={`Xoá liên hệ của "${contact.name}"? Tệp đính kèm cũng bị xoá theo.`}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-0 py-0">
                  <EmptyState
                    icon={<MailIcon className="size-6" />}
                    title={filtered ? "Không có kết quả" : "Chưa có liên hệ nào"}
                    description={
                      filtered
                        ? "Thử đổi từ khoá hoặc bỏ bộ lọc trạng thái."
                        : "Yêu cầu gửi từ trang Liên hệ sẽ hiện ở đây."
                    }
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
        basePath="/admin/contacts"
      />
    </div>
  );
}
