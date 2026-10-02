import Link from "next/link";
import { notFound } from "next/navigation";

import { ContactNoteForm } from "@/components/admin/contact-note-form";
import {
  ContactStatusBadge,
  ContactStatusButtons,
} from "@/components/admin/contact-status";
import { DeleteButton } from "@/components/admin/delete-button";
import { ExternalIcon, PaperclipIcon } from "@/components/admin/icons";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { findContact, formatBytes } from "@/lib/contacts";
import { formatDateTime } from "@/lib/format";
import { BUTTON, CARD, CODE_CHIP } from "@/lib/styles";
import {
  deleteContactAndGoBackAction,
  saveContactNoteAction,
  setContactStatusAction,
} from "../actions";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={CARD}>
      <div className="border-b border-admin-border px-5 py-3.5">
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm text-admin-muted">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </div>
  );
}

export default async function ContactDetailPage(
  props: PageProps<"/admin/contacts/[id]">,
) {
  const { id } = await props.params;
  const contact = await findContact(id);

  if (!contact) notFound();

  const attachmentHref = `/admin/contacts/${contact.id}/attachment`;

  return (
    <div className="space-y-5">
      <BackLink href="/admin/contacts">Danh sách liên hệ</BackLink>

      <PageHeader
        title={contact.subject || `Liên hệ từ ${contact.name}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>Gửi lúc {formatDateTime(contact.createdAt)}</span>
            {contact.handledAt && (
              <span>
                · Xử lý {formatDateTime(contact.handledAt)}
                {contact.handledBy ? ` bởi ${contact.handledBy}` : ""}
              </span>
            )}
          </span>
        }
        action={<ContactStatusBadge status={contact.status} />}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section title="Nội dung">
            {/* whitespace-pre-line: giữ nguyên cách xuống dòng người gửi gõ */}
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {contact.message}
            </p>
          </Section>

          <Section title="Tệp đính kèm">
            {contact.attachment ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <PaperclipIcon className="size-5 shrink-0 text-admin-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {contact.attachment.name}
                    </p>
                    <p className="text-xs text-admin-muted">
                      {formatBytes(contact.attachment.size)} ·{" "}
                      <code className={CODE_CHIP}>
                        {contact.attachment.mime}
                      </code>
                    </p>
                  </div>
                  <Link
                    href={attachmentHref}
                    target="_blank"
                    className={BUTTON.secondary}
                  >
                    <ExternalIcon className="size-4" />
                    {contact.attachment.inline ? "Mở xem" : "Tải về"}
                  </Link>
                </div>

                {/* Chỉ xem trước thứ chắc chắn an toàn khi nhúng. Mọi định
                    dạng khác đều buộc tải về — xem backend/attachments.ts */}
                {contact.attachment.inline &&
                  (contact.attachment.mime.startsWith("image/") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={attachmentHref}
                      alt={contact.attachment.name}
                      className="max-h-[32rem] w-full rounded-lg border border-admin-border object-contain"
                    />
                  ) : (
                    <object
                      data={attachmentHref}
                      type={contact.attachment.mime}
                      className="h-[32rem] w-full rounded-lg border border-admin-border"
                    >
                      <p className="p-4 text-sm text-admin-muted">
                        Trình duyệt không xem trước được tệp này.{" "}
                        <Link href={attachmentHref} className="underline">
                          Mở ở tab mới
                        </Link>
                        .
                      </p>
                    </object>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-admin-muted">
                Người gửi không đính kèm tệp nào.
              </p>
            )}
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Người gửi">
            <dl className="space-y-3">
              <Row label="Họ tên">{contact.name}</Row>
              <Row label="Email">
                <a
                  href={`mailto:${contact.email}`}
                  className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
                >
                  {contact.email}
                </a>
              </Row>
              <Row label="Điện thoại">
                {contact.phone ? (
                  <a
                    href={`tel:${contact.phone.replace(/\s/g, "")}`}
                    className="font-medium text-brand-700 underline-offset-4 hover:underline dark:text-brand-300"
                  >
                    {contact.phone}
                  </a>
                ) : (
                  <span className="text-admin-muted">—</span>
                )}
              </Row>
              <Row label="Chủ đề">
                {contact.subject ?? (
                  <span className="text-admin-muted">—</span>
                )}
              </Row>
            </dl>
          </Section>

          <Section title="Trạng thái">
            <p className="text-sm text-admin-muted">
              Đang là{" "}
              <span className="font-medium text-admin-text">
                <ContactStatusBadge status={contact.status} />
              </span>
              . Chuyển sang:
            </p>
            <ContactStatusButtons
              id={contact.id}
              current={contact.status}
              action={setContactStatusAction}
            />
          </Section>

          <Section title="Ghi chú">
            <ContactNoteForm
              defaultNote={contact.note}
              action={saveContactNoteAction.bind(null, contact.id)}
            />
          </Section>

          <Section title="Xoá">
            <p className="text-sm text-admin-muted">
              Xoá liên hệ sẽ xoá luôn tệp đính kèm trên máy chủ và không hoàn
              tác được.
            </p>
            <DeleteButton
              id={contact.id}
              action={deleteContactAndGoBackAction}
              confirmText={`Xoá liên hệ của "${contact.name}"? Tệp đính kèm cũng bị xoá theo.`}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}
