/**
 * Email gửi ứng viên theo các bước của hồ sơ tuyển dụng.
 *
 * Hàm thuần như email đơn hàng: nhận hồ sơ + loại email, trả về
 * `{ subject, preheader, html, text }`. Khung chung ở `email-layout.ts`.
 *
 * `note` của hồ sơ là ghi chú NỘI BỘ — không bao giờ vào email. Thứ duy nhất
 * người tuyển dụng gửi kèm được là `message`, nhập riêng lúc chuyển bước.
 */
import type {
  Candidate,
  CandidateStatus,
} from '../recruitment/recruitment.entity';
import {
  C,
  FONT,
  button,
  escapeHtml,
  formatDateTime,
  heading,
  htmlToText,
  noteBox,
  renderShell,
  sectionTitle,
  textFooter,
  type RenderedEmail,
  type Tone,
} from './email-layout';
import type { MailBrand } from './mail-brand';

export const CANDIDATE_EMAIL_KINDS = [
  'received',
  'screening',
  'interview',
  'offered',
  'hired',
  'rejected',
] as const;
export type CandidateEmailKind = (typeof CANDIDATE_EMAIL_KINDS)[number];

export type CandidateEmailOptions = {
  /** Lời nhắn người tuyển dụng gửi kèm (địa điểm phỏng vấn, chi tiết offer…). */
  message?: string | null;
  /** Lịch phỏng vấn đổi trong lúc vẫn ở bước Phỏng vấn. */
  rescheduled?: boolean;
};

/**
 * Bước nào có email nào. Trả về `new` (đưa hồ sơ về hàng chờ) thì không có
 * gì để báo ứng viên. `received` gửi lúc nộp, không qua hàm này.
 */
export function candidateEmailKindFor(
  status: CandidateStatus,
): CandidateEmailKind | null {
  return status === 'new' ? null : status;
}

/** Mã hồ sơ hiển thị cho ứng viên, để họ nhắc tới khi liên hệ. */
export const candidateCode = (candidate: Pick<Candidate, 'id'>) =>
  `UV${String(candidate.id).padStart(6, '0')}`;

/* ───────────────────────────── Màu theo loại ───────────────────────────── */

const TONES = {
  amber: { accent: '#b7791f', tint: '#fdf6e7', icon: '📨' },
  blue: { accent: '#1a59db', tint: '#eef5ff', icon: '🔎' },
  indigo: { accent: '#4338ca', tint: '#eef0ff', icon: '📅' },
  teal: { accent: '#0f766e', tint: '#e8f8f5', icon: '💼' },
  green: { accent: '#15803d', tint: '#ecfbf1', icon: '🎉' },
  slate: { accent: '#475569', tint: '#f1f4f8', icon: '✉' },
} satisfies Record<string, Tone>;

/* ─────────────────────────── Nội dung từng loại ─────────────────────────── */

type Copy = {
  tone: Tone;
  subject: string;
  eyebrow: string;
  title: string;
  /** Đoạn mở đầu, đã là HTML an toàn. */
  intro: string;
  /** Tiêu đề hộp lời nhắn, nếu người tuyển dụng có gửi kèm. */
  messageLabel: string;
};

function copyFor(
  kind: CandidateEmailKind,
  candidate: Candidate,
  brand: MailBrand,
  rescheduled: boolean,
): Copy {
  const name = escapeHtml(candidate.fullName);
  const job = `<strong>${escapeHtml(candidate.job.title)}</strong>`;
  const company = escapeHtml(brand.shortName);
  const phone = `<strong>${escapeHtml(candidate.phone)}</strong>`;
  const title = candidate.job.title;

  switch (kind) {
    case 'received':
      return {
        tone: TONES.amber,
        subject: `Đã nhận hồ sơ ứng tuyển ${title}`,
        eyebrow: 'Đã nhận hồ sơ',
        title: 'Cảm ơn bạn đã ứng tuyển!',
        intro: `Xin chào ${name}, ${company} đã nhận được hồ sơ của bạn cho vị trí ${job}. Nếu hồ sơ phù hợp, bộ phận tuyển dụng sẽ liên hệ qua email này hoặc số ${phone}.`,
        messageLabel: 'Lời nhắn',
      };
    case 'screening':
      return {
        tone: TONES.blue,
        subject: `Hồ sơ ${title} đang được xem xét`,
        eyebrow: 'Đang xem xét',
        title: 'Hồ sơ của bạn đang được xem xét',
        intro: `Xin chào ${name}, hồ sơ ứng tuyển vị trí ${job} của bạn đã qua bước tiếp nhận và đang được bộ phận chuyên môn đánh giá. Chúng tôi sẽ báo kết quả qua email.`,
        messageLabel: 'Lời nhắn từ bộ phận tuyển dụng',
      };
    case 'interview': {
      const when = candidate.interviewAt
        ? ` vào lúc <strong>${formatDateTime(candidate.interviewAt)}</strong>`
        : '';
      return {
        tone: TONES.indigo,
        subject: rescheduled
          ? `Cập nhật lịch phỏng vấn ${title}`
          : `Thư mời phỏng vấn vị trí ${title}`,
        eyebrow: rescheduled ? 'Đổi lịch phỏng vấn' : 'Mời phỏng vấn',
        title: rescheduled
          ? 'Lịch phỏng vấn của bạn đã thay đổi'
          : 'Bạn được mời phỏng vấn!',
        intro: rescheduled
          ? `Xin chào ${name}, lịch phỏng vấn vị trí ${job} đã được cập nhật${when}. Mong bạn thông cảm cho sự thay đổi này.`
          : `Xin chào ${name}, chúc mừng hồ sơ của bạn đã vượt qua vòng sàng lọc. ${company} trân trọng mời bạn tham gia phỏng vấn vị trí ${job}${when}.` +
            (candidate.interviewAt
              ? ''
              : ` Bộ phận tuyển dụng sẽ liên hệ qua số ${phone} để thống nhất thời gian.`),
        messageLabel: 'Thông tin buổi phỏng vấn',
      };
    }
    case 'offered':
      return {
        tone: TONES.teal,
        subject: `Thư mời nhận việc vị trí ${title}`,
        eyebrow: 'Lời mời làm việc',
        title: 'Chúng tôi muốn bạn gia nhập đội ngũ!',
        intro: `Xin chào ${name}, sau quá trình phỏng vấn, ${company} trân trọng gửi đến bạn lời mời làm việc cho vị trí ${job}. Vui lòng phản hồi email này để xác nhận hoặc trao đổi thêm.`,
        messageLabel: 'Chi tiết lời mời',
      };
    case 'hired':
      return {
        tone: TONES.green,
        subject: `Chào mừng bạn gia nhập ${brand.shortName}`,
        eyebrow: 'Trúng tuyển',
        title: `Chào mừng bạn đến với ${brand.shortName}!`,
        intro: `Xin chào ${name}, cảm ơn bạn đã nhận lời mời cho vị trí ${job}. Chúng tôi rất vui được làm việc cùng bạn.`,
        messageLabel: 'Hướng dẫn nhận việc',
      };
    case 'rejected':
      return {
        tone: TONES.slate,
        subject: `Kết quả ứng tuyển vị trí ${title}`,
        eyebrow: 'Kết quả ứng tuyển',
        title: 'Cảm ơn bạn đã quan tâm',
        intro: `Xin chào ${name}, cảm ơn bạn đã dành thời gian ứng tuyển vị trí ${job}. Sau khi cân nhắc, chúng tôi rất tiếc chưa thể tiếp tục với hồ sơ của bạn ở thời điểm này. Bạn vẫn có thể ứng tuyển các vị trí khác trên trang Tuyển dụng của ${company}.`,
        messageLabel: 'Lời nhắn từ bộ phận tuyển dụng',
      };
  }
}

/* ─────────────────────────────── Các khối ─────────────────────────────── */

const STEPS: { status: CandidateStatus; label: string }[] = [
  { status: 'new', label: 'Nộp hồ sơ' },
  { status: 'screening', label: 'Sàng lọc' },
  { status: 'interview', label: 'Phỏng vấn' },
  { status: 'offered', label: 'Offer' },
  { status: 'hired', label: 'Nhận việc' },
];

/** Thanh tiến trình 5 bước. Hồ sơ không phù hợp thì không vẽ. */
function progress(status: CandidateStatus, tone: Tone): string {
  const current = STEPS.findIndex((s) => s.status === status);
  if (current < 0) return '';

  const cells = STEPS.map((step, i) => {
    const done = i < current;
    const active = i === current;
    const on = done || active;
    const line = (lit: boolean) =>
      `<td valign="middle" style="padding:0;"><div style="height:2px;line-height:2px;font-size:0;background:${lit ? tone.accent : C.border};">&nbsp;</div></td>`;

    return `
      <td width="20%" align="center" valign="top" style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${i === 0 ? '<td style="font-size:0;">&nbsp;</td>' : line(i <= current)}
            <td width="28" align="center" style="padding:0;">
              <div style="width:24px;height:24px;line-height:24px;border-radius:50%;border:2px solid ${on ? tone.accent : C.border};background:${on ? tone.accent : '#ffffff'};color:${on ? '#ffffff' : C.faint};font-size:12px;font-weight:700;${FONT}">${done ? '✓' : String(i + 1)}</div>
            </td>
            ${i === STEPS.length - 1 ? '<td style="font-size:0;">&nbsp;</td>' : line(i < current)}
          </tr>
        </table>
        <div style="padding-top:6px;font-size:12px;${FONT}color:${active ? tone.accent : done ? C.text : C.faint};font-weight:${active ? 700 : 500};">${step.label}</div>
      </td>`;
  }).join('');

  return `
    <tr><td style="padding:4px 32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table>
    </td></tr>`;
}

/** Thời điểm phỏng vấn dạng Google Calendar: 20261015T020000Z. */
const calendarStamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** Link "Thêm vào lịch" — mặc định buổi phỏng vấn kéo dài 1 tiếng. */
function calendarUrl(
  candidate: Candidate,
  brand: MailBrand,
  details: string | null,
): string {
  const start = new Date(candidate.interviewAt as string);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Phỏng vấn ${candidate.job.title} — ${brand.shortName}`,
    dates: `${calendarStamp(start)}/${calendarStamp(end)}`,
    details: details ?? '',
    location: brand.address,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Khối lịch phỏng vấn nổi bật: thứ, ngày, giờ — thứ ứng viên cần nhất. */
function interviewBox(
  candidate: Candidate,
  brand: MailBrand,
  tone: Tone,
  message: string | null,
): string {
  if (!candidate.interviewAt) return '';
  const at = new Date(candidate.interviewAt);
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      ...options,
    }).format(at);

  const weekday = part({ weekday: 'long' });
  const date = part({ day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = part({ hour: '2-digit', minute: '2-digit', hour12: false });

  return `
    <tr><td style="padding:0 32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${C.border};border-radius:10px;">
        <tr>
          <td class="stack" width="150" align="center" valign="middle" style="background:${tone.accent};border-radius:10px 0 0 10px;padding:18px 12px;${FONT}">
            <div style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#e6e9ff;">${escapeHtml(weekday)}</div>
            <div style="padding-top:4px;font-size:30px;line-height:34px;font-weight:800;color:#ffffff;">${escapeHtml(time)}</div>
            <div style="padding-top:2px;font-size:14px;font-weight:600;color:#ffffff;">${escapeHtml(date)}</div>
          </td>
          <td class="stack" valign="middle" style="padding:16px 18px;${FONT}">
            <div style="font-size:12px;color:${C.faint};">Vị trí</div>
            <div style="font-size:15px;font-weight:700;color:${C.text};padding-top:2px;">${escapeHtml(candidate.job.title)}</div>
            <div style="padding-top:10px;font-size:13px;line-height:19px;color:${C.muted};">Giờ Việt Nam (GMT+7). Vui lòng tham dự đúng giờ${message ? ' — thông tin chi tiết ở bên dưới' : ''}.</div>
            <div style="padding-top:10px;font-size:13px;"><a href="${escapeHtml(calendarUrl(candidate, brand, message))}" style="color:${C.brand};font-weight:600;text-decoration:none;">＋ Thêm vào Google Calendar</a></div>
          </td>
        </tr>
      </table>
    </td></tr>`;
}

function summary(candidate: Candidate): string {
  const field = (label: string, value: string) => `
    <div style="padding-bottom:10px;${FONT}">
      <div style="font-size:12px;color:${C.faint};">${label}</div>
      <div style="font-size:14px;line-height:20px;color:${C.text};padding-top:2px;">${value}</div>
    </div>`;

  return `
    <tr><td style="padding:0 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.soft};border:1px solid ${C.border};border-radius:10px;">
        <tr>
          <td class="stack" width="50%" valign="top" style="padding:16px 16px 6px;">
            ${sectionTitle('Hồ sơ ứng tuyển')}
            ${field('Mã hồ sơ', `<strong style="font-family:Consolas,Menlo,monospace;">${candidateCode(candidate)}</strong>`)}
            ${field('Vị trí', escapeHtml(candidate.job.title))}
            ${field('Đợt tuyển dụng', escapeHtml(candidate.batch.name))}
          </td>
          <td class="stack" width="50%" valign="top" style="padding:16px 16px 6px;">
            ${sectionTitle('Thông tin của bạn')}
            ${field('Họ tên', escapeHtml(candidate.fullName))}
            ${field('Điện thoại', escapeHtml(candidate.phone))}
            ${field('Ngày nộp', formatDateTime(candidate.createdAt))}
          </td>
        </tr>
      </table>
    </td></tr>`;
}

/* ─────────────────────────────── Ghép lại ─────────────────────────────── */

export function renderCandidateEmail(
  kind: CandidateEmailKind,
  candidate: Candidate,
  brand: MailBrand,
  options: CandidateEmailOptions = {},
): RenderedEmail {
  const rescheduled = kind === 'interview' && options.rescheduled === true;
  const copy = copyFor(kind, candidate, brand, rescheduled);
  const { tone } = copy;
  const message = options.message?.trim() || null;
  const subject = `[${brand.shortName}] ${copy.subject}`;
  const preheader = htmlToText(copy.intro);

  const cta =
    kind === 'rejected'
      ? {
          href: `${brand.siteUrl}/tuyen-dung`,
          label: 'Xem các vị trí đang tuyển',
        }
      : {
          href: `${brand.siteUrl}/tuyen-dung/${encodeURIComponent(candidate.job.slug)}`,
          label: 'Xem lại vị trí ứng tuyển',
        };

  // Bước hiện trên thanh tiến trình: thư "đã nhận" dừng ở bước Nộp hồ sơ.
  const step: CandidateStatus = kind === 'received' ? 'new' : kind;

  const html = renderShell({
    brand,
    subject,
    preheader,
    tone,
    headerRight: `Hồ sơ <span style="color:#ffffff;font-weight:700;font-family:Consolas,Menlo,monospace;">${candidateCode(candidate)}</span>`,
    body: `${heading(tone, copy.eyebrow, copy.title, copy.intro)}
        ${progress(step, tone)}
        ${kind === 'interview' ? interviewBox(candidate, brand, tone, message) : ''}
        ${message ? noteBox(copy.messageLabel, message, tone) : ''}
        ${summary(candidate)}
        ${button(cta.href, cta.label, C.brand)}`,
    reason: `Bạn nhận email này vì đã ứng tuyển vị trí ${escapeHtml(candidate.job.title)} tại`,
  });

  return {
    subject,
    preheader,
    html,
    text: renderText(kind, candidate, brand, copy, message, cta),
  };
}

/** Bản chữ thuần — cho hộp thư không hiện HTML và giúp tránh bị chấm spam. */
function renderText(
  kind: CandidateEmailKind,
  candidate: Candidate,
  brand: MailBrand,
  copy: Copy,
  message: string | null,
  cta: { href: string; label: string },
): string {
  const lines: string[] = [
    copy.title.toUpperCase(),
    '',
    htmlToText(copy.intro),
    '',
  ];

  if (kind === 'interview' && candidate.interviewAt) {
    lines.push(
      `LỊCH PHỎNG VẤN: ${formatDateTime(candidate.interviewAt)} (giờ Việt Nam)`,
      '',
    );
  }
  if (message) lines.push(`${copy.messageLabel}:`, message, '');

  lines.push(
    'HỒ SƠ ỨNG TUYỂN',
    `  Mã hồ sơ:   ${candidateCode(candidate)}`,
    `  Vị trí:     ${candidate.job.title}`,
    `  Đợt:        ${candidate.batch.name}`,
    `  Họ tên:     ${candidate.fullName}`,
    `  Ngày nộp:   ${formatDateTime(candidate.createdAt)}`,
    '',
    `${cta.label}: ${cta.href}`,
    '',
    ...textFooter(brand),
  );

  return lines.join('\n');
}
