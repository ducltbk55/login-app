import Link from "next/link";
import { notFound } from "next/navigation";

import { CandidateNotesForm } from "@/components/admin/candidate-notes-form";
import { CandidateStepForm } from "@/components/admin/candidate-step-form";
import { DeleteButton } from "@/components/admin/delete-button";
import { ExternalIcon, PaperclipIcon } from "@/components/admin/icons";
import { BackLink, PageHeader } from "@/components/admin/page-header";
import { CandidateStatusBadge } from "@/components/admin/recruitment-status";
import { can } from "@/lib/access";
import { currentUser } from "@/lib/admin";
import { formatBytes } from "@/lib/contacts";
import { formatDateTime } from "@/lib/format";
import {
  CANDIDATE_EMAIL_LABELS,
  CANDIDATE_STATUS_LABELS,
  findCandidate,
  type CandidateEvent,
  type CandidateStatus,
} from "@/lib/recruitment";
import { BUTTON, CARD, CODE_CHIP, LINK } from "@/lib/styles";
import {
  changeCandidateStepAction,
  deleteCandidateAndGoBackAction,
  saveCandidateNotesAction,
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

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-admin-muted">{label}</dt>
      {/* Email, link dài không có khoảng trắng: cho bẻ ở bất kỳ đâu. */}
      <dd className="text-sm [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

const statusLabel = (value: string | null) =>
  value ? (CANDIDATE_STATUS_LABELS[value as CandidateStatus] ?? value) : "—";

/** Một dòng nhật ký, viết thành câu cho dễ đọc. */
function describeEvent(event: CandidateEvent): string {
  switch (event.type) {
    case "created":
      return "Ứng viên nộp hồ sơ";
    case "status":
      return `Chuyển từ "${statusLabel(event.fromValue)}" sang "${statusLabel(event.toValue)}"`;
    case "interview":
      return event.toValue
        ? `Hẹn phỏng vấn lúc ${formatDateTime(event.toValue)}`
        : "Huỷ lịch phỏng vấn";
    case "email": {
      const label = CANDIDATE_EMAIL_LABELS[event.toValue ?? ""] ?? event.toValue;
      const result =
        event.fromValue === "sent"
          ? "đã gửi"
          : event.fromValue === "failed"
            ? "GỬI LỖI — kiểm tra cấu hình SMTP"
            : "chưa gửi vì SMTP chưa cấu hình (chỉ ghi log)";
      return `Email “${label}” cho ứng viên: ${result}`;
    }
  }
}

export default async function CandidateDetailPage(
  props: PageProps<"/admin/candidates/[id]">,
) {
  const { id } = await props.params;
  const [candidate, user] = await Promise.all([
    findCandidate(id),
    currentUser(),
  ]);
  if (!candidate) notFound();

  const canWrite = can(user!, "CANDIDATES.WRITE");
  const cvHref = `/admin/candidates/${candidate.id}/cv`;

  return (
    <div className="space-y-5">
      <BackLink href="/admin/candidates">Danh sách ứng viên</BackLink>

      <PageHeader
        title={candidate.fullName}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>Ứng tuyển {candidate.job.title}</span>
            <span>· {candidate.batch.name}</span>
            <span>· Nộp lúc {formatDateTime(candidate.createdAt)}</span>
          </span>
        }
        action={<CandidateStatusBadge status={candidate.status} />}
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Section title="CV">
            <div className="flex flex-wrap items-center gap-3">
              <PaperclipIcon className="size-5 shrink-0 text-admin-muted" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{candidate.cv.name}</p>
                <p className="text-xs text-admin-muted">
                  {formatBytes(candidate.cv.size)} ·{" "}
                  <code className={CODE_CHIP}>{candidate.cv.mime}</code>
                </p>
              </div>
              <Link href={cvHref} target="_blank" className={BUTTON.secondary}>
                <ExternalIcon className="size-4" />
                {candidate.cv.inline ? "Mở xem" : "Tải về"}
              </Link>
            </div>

            {/* Chỉ PDF được nhúng xem trước; Word luôn tải về. */}
            {candidate.cv.inline && (
              <object
                data={cvHref}
                type="application/pdf"
                className="h-[40rem] w-full rounded-lg border border-admin-border"
              >
                <p className="p-4 text-sm text-admin-muted">
                  Trình duyệt không xem trước được tệp này.{" "}
                  <Link href={cvHref} className="underline">
                    Mở ở tab mới
                  </Link>
                  .
                </p>
              </object>
            )}
          </Section>

          <Section title="Thư giới thiệu">
            {candidate.coverLetter ? (
              // whitespace-pre-line: giữ cách xuống dòng ứng viên gõ
              <p className="text-sm leading-relaxed whitespace-pre-line">
                {candidate.coverLetter}
              </p>
            ) : (
              <p className="text-sm text-admin-muted">
                Ứng viên không viết thư giới thiệu.
              </p>
            )}
          </Section>

          <Section title="Lịch sử hồ sơ">
            <ol className="space-y-3">
              {candidate.events.map((event) => (
                <li key={event.id} className="flex gap-3 text-sm">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                      event.type === "email" && event.fromValue === "failed"
                        ? "bg-red-500"
                        : event.type === "email"
                          ? "bg-emerald-500"
                          : "bg-brand-500"
                    }`}
                  />
                  <div>
                    <p>{describeEvent(event)}</p>
                    <p className="text-xs text-admin-muted">
                      {formatDateTime(event.createdAt)}
                      {event.actor ? ` · ${event.actor}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Section>
        </div>

        <div className="space-y-5">
          <Section title="Thông tin ứng viên">
            <dl className="space-y-3">
              <Row label="Họ tên">{candidate.fullName}</Row>
              <Row label="Email">
                <a href={`mailto:${candidate.email}`} className={LINK}>
                  {candidate.email}
                </a>
              </Row>
              <Row label="Điện thoại">
                <a
                  href={`tel:${candidate.phone.replace(/\s/g, "")}`}
                  className={LINK}
                >
                  {candidate.phone}
                </a>
              </Row>
              <Row label="Kinh nghiệm">
                {candidate.experience ?? (
                  <span className="text-admin-muted">—</span>
                )}
              </Row>
              <Row label="Portfolio">
                {candidate.portfolioUrl ? (
                  <a
                    href={candidate.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className={LINK}
                  >
                    {candidate.portfolioUrl}
                  </a>
                ) : (
                  <span className="text-admin-muted">—</span>
                )}
              </Row>
              <Row label="Vị trí">
                <Link
                  href={`/admin/candidates?jobId=${candidate.jobId}`}
                  className={LINK}
                >
                  {candidate.job.title}
                </Link>
              </Row>
              <Row label="Đợt">
                <Link
                  href={`/admin/candidates?batchId=${candidate.batchId}`}
                  className={LINK}
                >
                  {candidate.batch.name}
                </Link>
              </Row>
            </dl>
          </Section>

          {canWrite && (
            <Section title="Chuyển bước">
              <p className="text-sm text-admin-muted">
                Đang ở bước{" "}
                <CandidateStatusBadge status={candidate.status} />
                {candidate.handledBy && (
                  <>
                    {" "}
                    — {candidate.handledBy},{" "}
                    {formatDateTime(candidate.handledAt ?? undefined)}
                  </>
                )}
                .
              </p>
              {candidate.interviewAt && (
                <p className="text-sm">
                  Lịch phỏng vấn:{" "}
                  <span className="font-medium">
                    {formatDateTime(candidate.interviewAt)}
                  </span>
                </p>
              )}
              <CandidateStepForm
                current={candidate.status}
                interviewAt={candidate.interviewAt}
                action={changeCandidateStepAction.bind(null, candidate.id)}
              />
            </Section>
          )}

          {canWrite ? (
            <Section title="Ghi chú nội bộ">
              <CandidateNotesForm
                note={candidate.note}
                action={saveCandidateNotesAction.bind(null, candidate.id)}
              />
            </Section>
          ) : (
            (candidate.interviewAt || candidate.note) && (
              <Section title="Phỏng vấn & ghi chú">
                {candidate.interviewAt && (
                  <p className="text-sm">
                    Phỏng vấn: {formatDateTime(candidate.interviewAt)}
                  </p>
                )}
                {candidate.note && (
                  <p className="text-sm whitespace-pre-line">
                    {candidate.note}
                  </p>
                )}
              </Section>
            )
          )}

          {canWrite && (
            <Section title="Xoá hồ sơ">
              <p className="text-sm text-admin-muted">
                Xoá hồ sơ sẽ xoá luôn CV trên máy chủ và không hoàn tác được.
                Ứng viên không phù hợp nên chuyển sang “Không phù hợp” để còn
                tra lại.
              </p>
              <DeleteButton
                id={candidate.id}
                action={deleteCandidateAndGoBackAction}
                confirmText={`Xoá hồ sơ của "${candidate.fullName}"?`}
              />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
