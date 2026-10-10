/**
 * Khung và khối dựng dùng chung cho mọi email gửi ra ngoài (đơn hàng, tuyển
 * dụng): header thương hiệu, thân có viền màu nhấn, footer liên hệ.
 *
 * HTML viết theo kiểu email: bố cục bằng `<table>`, style inline, rộng tối đa
 * 600px, không dùng flex/grid hay CSS ngoài — Gmail và Outlook bỏ hết những
 * thứ đó. Mọi giá trị đến từ người dùng/admin đều phải qua `escapeHtml`.
 */
import type { MailBrand } from './mail-brand';

export type RenderedEmail = {
  subject: string;
  /** Dòng xem trước hiện cạnh tiêu đề trong hộp thư. */
  preheader: string;
  html: string;
  text: string;
};

/* ───────────────────────────── Bảng màu ───────────────────────────── */

export const C = {
  page: '#eef2f8',
  card: '#ffffff',
  soft: '#f6f8fc',
  border: '#e3e9f3',
  text: '#0e1b30',
  muted: '#5a6b88',
  faint: '#8c9ab3',
  ink: '#0b0b0d',
  gold: '#ddae33',
  brand: '#1a59db',
} as const;

export type Tone = { accent: string; tint: string; icon: string };

export const FONT =
  "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;";

/* ─────────────────────────── Định dạng chung ─────────────────────────── */

const DATE_TIME = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export const formatDateTime = (iso: string) => DATE_TIME.format(new Date(iso));

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Ngược lại của `escapeHtml` sau khi bỏ thẻ — cho preheader và bản chữ thuần. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** Escape + giữ xuống dòng của ghi chú nhiều dòng. */
export const multiline = (value: string) =>
  escapeHtml(value).replace(/\r?\n/g, '<br>');

/** Ảnh/link lưu dạng `/media/...` phải thành URL tuyệt đối thì hộp thư mới tải được. */
export function absoluteUrl(brand: MailBrand, path: string): string {
  return /^https?:\/\//i.test(path) ? path : `${brand.siteUrl}${path}`;
}

/* ─────────────────────────────── Các khối ─────────────────────────────── */

export function noteBox(label: string, note: string, tone: Tone): string {
  return `
    <tr><td style="padding:0 32px 24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${tone.tint};border-left:4px solid ${tone.accent};border-radius:6px;">
        <tr><td style="padding:14px 16px;${FONT}">
          <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${tone.accent};">${escapeHtml(label)}</div>
          <div style="padding-top:4px;font-size:14px;line-height:21px;color:${C.text};">${multiline(note)}</div>
        </td></tr>
      </table>
    </td></tr>`;
}

export function sectionTitle(text: string): string {
  return `<div style="padding-bottom:10px;font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${C.muted};${FONT}">${text}</div>`;
}

export function button(href: string, label: string, color: string): string {
  return `
    <tr><td align="center" style="padding:24px 32px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" bgcolor="${color}" style="border-radius:8px;">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;${FONT}">${label}</a>
        </td>
      </tr></table>
    </td></tr>`;
}

/** Huy hiệu + tiêu đề lớn + đoạn mở đầu — phần đầu thân của mọi email. */
export function heading(
  tone: Tone,
  eyebrow: string,
  title: string,
  introHtml: string,
): string {
  return `<tr><td class="px" style="padding:32px 32px 20px;${FONT}">
          <div style="display:inline-block;padding:4px 10px;border-radius:999px;background:${tone.tint};color:${tone.accent};font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;">${tone.icon}&nbsp; ${escapeHtml(eyebrow)}</div>
          <h1 style="margin:14px 0 10px;font-size:24px;line-height:31px;font-weight:800;color:${C.text};">${escapeHtml(title)}</h1>
          <p style="margin:0;font-size:15px;line-height:23px;color:${C.muted};">${introHtml}</p>
        </td></tr>`;
}

/* ─────────────────────────────── Khung ─────────────────────────────── */

export type ShellOptions = {
  brand: MailBrand;
  subject: string;
  preheader: string;
  tone: Tone;
  /** HTML góc phải header, vd. mã đơn. */
  headerRight: string;
  /** Các hàng `<tr>` của thân email. */
  body: string;
  /** Câu "Bạn nhận email này vì…", đã là HTML an toàn. */
  reason: string;
};

export function renderShell(o: ShellOptions): string {
  const { brand } = o;
  return `<!DOCTYPE html>
<html lang="vi" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(o.subject)}</title>
<style>
  @media (max-width:620px){
    .container{width:100%!important}
    .px{padding-left:20px!important;padding-right:20px!important}
    .stack{display:block!important;width:100%!important;box-sizing:border-box}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(o.preheader)}${'&#8203;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

    <!-- Header -->
    <tr><td style="background:${C.ink};border-radius:14px 14px 0 0;padding:18px 32px;" class="px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="middle" width="44"><a href="${escapeHtml(brand.siteUrl)}"><img src="${escapeHtml(absoluteUrl(brand, brand.logoPath))}" width="40" height="40" alt="${escapeHtml(brand.shortName)}" style="display:block;width:40px;height:40px;border:0;"></a></td>
        <td valign="middle" style="padding-left:10px;${FONT}">
          <div style="font-size:16px;font-weight:800;letter-spacing:.06em;color:${C.gold};">${escapeHtml(brand.shortName)}</div>
          <div style="font-size:11px;color:#9a9aa5;">${escapeHtml(brand.companyName)}</div>
        </td>
        <td valign="middle" align="right" style="font-size:12px;color:#9a9aa5;${FONT}">${o.headerRight}</td>
      </tr></table>
    </td></tr>

    <!-- Thân -->
    <tr><td style="background:${C.card};border-top:4px solid ${o.tone.accent};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${o.body}
      </table>
    </td></tr>

    <!-- Footer -->
    <tr><td class="px" style="background:${C.soft};border-top:1px solid ${C.border};border-radius:0 0 14px 14px;padding:22px 32px;${FONT}">
      <div style="font-size:13px;line-height:20px;color:${C.muted};">
        Cần hỗ trợ? Gọi <a href="tel:${escapeHtml(brand.phone.replace(/\s/g, ''))}" style="color:${C.brand};text-decoration:none;font-weight:600;">${escapeHtml(brand.phone)}</a>
        hoặc email <a href="mailto:${escapeHtml(brand.email)}" style="color:${C.brand};text-decoration:none;font-weight:600;">${escapeHtml(brand.email)}</a>
        <br>${escapeHtml(brand.workingHours)}
      </div>
      <div style="padding-top:12px;font-size:12px;line-height:18px;color:${C.faint};">
        <strong style="color:${C.muted};">${escapeHtml(brand.companyName)}</strong><br>
        ${escapeHtml(brand.address)}<br>
        ${o.reason} <a href="${escapeHtml(brand.siteUrl)}" style="color:${C.faint};">${escapeHtml(brand.siteUrl.replace(/^https?:\/\//, ''))}</a>.
      </div>
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Phần chân của bản chữ thuần. */
export function textFooter(brand: MailBrand): string[] {
  return [
    '—',
    brand.companyName,
    brand.address,
    `Hotline: ${brand.phone} · Email: ${brand.email}`,
    brand.workingHours,
  ];
}
