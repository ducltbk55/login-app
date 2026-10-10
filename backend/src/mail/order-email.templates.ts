/**
 * Email gửi khách theo vòng đời đơn hàng.
 *
 * Hàm thuần: nhận đơn + loại email, trả về `{ subject, preheader, html, text }`.
 * Không biết gì về SMTP — nơi gửi (nodemailer, SES, …) chỉ việc lấy kết quả.
 * Khung email và các khối chung nằm ở `email-layout.ts`.
 */
import type {
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../orders/order.entity';
import {
  C,
  FONT,
  absoluteUrl,
  button,
  escapeHtml,
  formatDateTime,
  heading,
  htmlToText,
  multiline,
  noteBox,
  renderShell,
  sectionTitle,
  textFooter,
  type RenderedEmail,
  type Tone,
} from './email-layout';
import type { MailBrand } from './mail-brand';

export { escapeHtml, type RenderedEmail };

export const ORDER_EMAIL_KINDS = [
  'placed',
  'confirmed',
  'shipping',
  'completed',
  'cancelled',
  'payment_received',
  'refunded',
] as const;
export type OrderEmailKind = (typeof ORDER_EMAIL_KINDS)[number];

export type OrderEmailOptions = {
  /**
   * Ghi chú admin nhập khi chuyển trạng thái (lý do huỷ, mã vận đơn, …).
   * Đây là ghi chú của SỰ KIỆN, không phải `order.adminNote` — ghi chú nội bộ
   * thì khách không bao giờ được thấy.
   */
  note?: string | null;
};

/**
 * Thay đổi nào thì gửi email nào. `null` = không gửi (vd. admin sửa nhầm
 * "đã thu" về "chưa thu" thì không làm phiền khách).
 */
export function orderEmailKindFor(
  change:
    | { type: 'created' }
    | { type: 'status'; to: OrderStatus }
    | { type: 'payment'; to: PaymentStatus },
): OrderEmailKind | null {
  if (change.type === 'created') return 'placed';
  if (change.type === 'status') {
    return change.to === 'pending' ? null : change.to;
  }
  if (change.to === 'paid') return 'payment_received';
  if (change.to === 'refunded') return 'refunded';
  return null;
}

/* ───────────────────────────── Màu theo loại ───────────────────────────── */

const TONES = {
  amber: { accent: '#b7791f', tint: '#fdf6e7', icon: '🧾' },
  blue: { accent: '#1a59db', tint: '#eef5ff', icon: '✅' },
  indigo: { accent: '#4338ca', tint: '#eef0ff', icon: '🚚' },
  green: { accent: '#15803d', tint: '#ecfbf1', icon: '🎉' },
  red: { accent: '#c0392b', tint: '#fdf0ee', icon: '✖' },
  slate: { accent: '#475569', tint: '#f1f4f8', icon: '↩' },
} satisfies Record<string, Tone>;

/* ─────────────────────────── Định dạng chung ─────────────────────────── */

const VND = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

export const formatVnd = (value: number) => VND.format(value);

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
};

/* ─────────────────────────── Nội dung từng loại ─────────────────────────── */

type Copy = {
  tone: Tone;
  subject: string;
  /** Nhãn nhỏ trên tiêu đề lớn. */
  eyebrow: string;
  title: string;
  /** Đoạn mở đầu, đã là HTML an toàn. */
  intro: string;
  /** Tiêu đề hộp ghi chú của admin, nếu có ghi chú. */
  noteLabel: string;
};

function copyFor(kind: OrderEmailKind, order: Order): Copy {
  const code = `<strong>${escapeHtml(order.code)}</strong>`;
  const name = escapeHtml(order.customerName);
  const phone = `<strong>${escapeHtml(order.customerPhone)}</strong>`;
  const total = `<strong>${formatVnd(order.total)}</strong>`;
  const codDue =
    order.paymentMethod === 'cod' && order.paymentStatus === 'unpaid';

  switch (kind) {
    case 'placed':
      return {
        tone: TONES.amber,
        subject: `Đã nhận đơn hàng ${order.code}`,
        eyebrow: 'Đặt hàng thành công',
        title: 'Cảm ơn bạn đã đặt hàng!',
        intro: `Xin chào ${name}, chúng tôi đã nhận được đơn ${code}. Nhân viên sẽ liên hệ qua số ${phone} để xác nhận trong giờ làm việc.`,
        noteLabel: 'Ghi chú',
      };
    case 'confirmed':
      return {
        tone: TONES.blue,
        subject: `Đơn hàng ${order.code} đã được xác nhận`,
        eyebrow: 'Đã xác nhận',
        title: 'Đơn hàng của bạn đã được xác nhận',
        intro: `Xin chào ${name}, đơn ${code} đã được xác nhận và đang được chuẩn bị. Chúng tôi sẽ báo ngay khi hàng bắt đầu được giao.`,
        noteLabel: 'Lời nhắn từ cửa hàng',
      };
    case 'shipping':
      return {
        tone: TONES.indigo,
        subject: `Đơn hàng ${order.code} đang được giao`,
        eyebrow: 'Đang giao hàng',
        title: 'Đơn hàng đang trên đường đến bạn',
        intro:
          `Xin chào ${name}, đơn ${code} đã được bàn giao cho đơn vị vận chuyển. Vui lòng để ý điện thoại ${phone} để nhận hàng.` +
          (codDue ? ` Số tiền cần thanh toán khi nhận: ${total}.` : ''),
        noteLabel: 'Thông tin vận chuyển',
      };
    case 'completed':
      return {
        tone: TONES.green,
        subject: `Đơn hàng ${order.code} đã hoàn thành`,
        eyebrow: 'Hoàn thành',
        title: 'Giao hàng thành công!',
        intro: `Xin chào ${name}, đơn ${code} đã hoàn tất. Cảm ơn bạn đã tin tưởng — nếu sản phẩm có bất kỳ vấn đề gì, hãy liên hệ để được hỗ trợ.`,
        noteLabel: 'Lời nhắn từ cửa hàng',
      };
    case 'cancelled':
      return {
        tone: TONES.red,
        subject: `Đơn hàng ${order.code} đã bị huỷ`,
        eyebrow: 'Đã huỷ',
        title: 'Đơn hàng đã bị huỷ',
        intro:
          `Xin chào ${name}, rất tiếc đơn ${code} đã bị huỷ.` +
          (order.paymentStatus === 'paid'
            ? ` Khoản ${total} bạn đã thanh toán sẽ được hoàn lại — chúng tôi sẽ gửi email khi hoàn tất.`
            : ' Bạn chưa bị trừ tiền cho đơn này.'),
        noteLabel: 'Lý do huỷ',
      };
    case 'payment_received':
      return {
        tone: TONES.green,
        subject: `Đã nhận thanh toán đơn ${order.code}`,
        eyebrow: 'Thanh toán thành công',
        title: `Đã nhận ${formatVnd(order.total)}`,
        intro: `Xin chào ${name}, chúng tôi đã nhận đủ ${total} cho đơn ${code}. Email này có thể dùng làm xác nhận thanh toán.`,
        noteLabel: 'Ghi chú',
      };
    case 'refunded':
      return {
        tone: TONES.slate,
        subject: `Đã hoàn tiền đơn ${order.code}`,
        eyebrow: 'Hoàn tiền',
        title: `Đã hoàn ${formatVnd(order.total)}`,
        intro: `Xin chào ${name}, chúng tôi đã hoàn ${total} cho đơn ${code}. Tuỳ ngân hàng, tiền có thể mất 1–3 ngày làm việc để về tài khoản.`,
        noteLabel: 'Thông tin hoàn tiền',
      };
  }
}

/* ─────────────────────────────── Các khối ─────────────────────────────── */

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: 'pending', label: 'Đặt hàng' },
  { status: 'confirmed', label: 'Xác nhận' },
  { status: 'shipping', label: 'Đang giao' },
  { status: 'completed', label: 'Hoàn thành' },
];

/** Thanh tiến trình 4 bước. Đơn huỷ thì không vẽ — tiến trình không còn ý nghĩa. */
function progress(order: Order, tone: Tone): string {
  const current = STEPS.findIndex((s) => s.status === order.status);
  if (current < 0) return '';

  const cells = STEPS.map((step, i) => {
    const done = i < current;
    const active = i === current;
    const dot = done || active ? tone.accent : '#ffffff';
    const ring = done || active ? tone.accent : C.border;
    const mark = done ? '✓' : String(i + 1);
    const markColor = done || active ? '#ffffff' : C.faint;
    const line = (on: boolean) =>
      // Ô cao bằng chấm tròn, nên vạch phải là khối con 2px canh giữa.
      `<td valign="middle" style="padding:0;"><div style="height:2px;line-height:2px;font-size:0;background:${on ? tone.accent : C.border};">&nbsp;</div></td>`;

    return `
      <td width="25%" align="center" valign="top" style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${i === 0 ? '<td style="font-size:0;">&nbsp;</td>' : line(i <= current)}
            <td width="28" align="center" style="padding:0;">
              <div style="width:24px;height:24px;line-height:24px;border-radius:50%;border:2px solid ${ring};background:${dot};color:${markColor};font-size:12px;font-weight:700;${FONT}">${mark}</div>
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

function itemsTable(order: Order, brand: MailBrand): string {
  const rows = order.items
    .map((item) => {
      const img = item.image
        ? `<img src="${escapeHtml(absoluteUrl(brand, item.image))}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:8px;border:1px solid ${C.border};object-fit:cover;">`
        : `<div style="width:56px;height:56px;border-radius:8px;background:${C.soft};border:1px solid ${C.border};"></div>`;
      const name = item.productSlug
        ? `<a href="${escapeHtml(`${brand.siteUrl}/san-pham/${encodeURIComponent(item.productSlug)}`)}" style="color:${C.text};text-decoration:none;">${escapeHtml(item.productName)}</a>`
        : escapeHtml(item.productName);
      const struck =
        item.listPrice > item.unitPrice
          ? ` <span style="color:${C.faint};text-decoration:line-through;">${formatVnd(item.listPrice)}</span>`
          : '';

      return `
        <tr>
          <td width="56" valign="top" style="padding:12px 12px 12px 0;border-bottom:1px solid ${C.border};">${img}</td>
          <td valign="top" style="padding:12px 0;border-bottom:1px solid ${C.border};${FONT}">
            <div style="font-size:14px;line-height:20px;font-weight:600;color:${C.text};">${name}</div>
            ${item.sku ? `<div style="font-size:12px;color:${C.faint};padding-top:2px;">Mã: ${escapeHtml(item.sku)}</div>` : ''}
            <div style="font-size:13px;color:${C.muted};padding-top:4px;">${item.quantity} × ${formatVnd(item.unitPrice)}${struck}</div>
          </td>
          <td valign="top" align="right" style="padding:12px 0 12px 12px;border-bottom:1px solid ${C.border};white-space:nowrap;font-size:14px;font-weight:600;color:${C.text};${FONT}">${formatVnd(item.lineTotal)}</td>
        </tr>`;
    })
    .join('');

  const line = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:4px 0;font-size:${strong ? 16 : 14}px;color:${strong ? C.text : C.muted};font-weight:${strong ? 700 : 400};${FONT}">${label}</td>
      <td align="right" style="padding:4px 0;font-size:${strong ? 18 : 14}px;color:${strong ? C.text : C.muted};font-weight:${strong ? 800 : 400};white-space:nowrap;${FONT}">${value}</td>
    </tr>`;

  return `
    <tr><td style="padding:0 32px 8px;">
      ${sectionTitle(`Sản phẩm (${order.itemCount})`)}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
        ${line('Tạm tính', formatVnd(order.subtotal))}
        ${order.discount > 0 ? line('Khuyến mãi', `<span style="color:#15803d;">−${formatVnd(order.discount)}</span>`) : ''}
        <tr><td colspan="2" style="padding-top:6px;border-bottom:1px solid ${C.border};font-size:0;">&nbsp;</td></tr>
        ${line('Tổng cộng', formatVnd(order.total), true)}
      </table>
    </td></tr>`;
}

function infoGrid(order: Order): string {
  const paid = order.paymentStatus === 'paid';
  const badge = `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:${paid ? '#ecfbf1' : order.paymentStatus === 'refunded' ? '#f1f4f8' : '#fdf6e7'};color:${paid ? '#15803d' : order.paymentStatus === 'refunded' ? '#475569' : '#b7791f'};">${PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>`;

  const field = (label: string, value: string) => `
    <div style="padding-bottom:10px;${FONT}">
      <div style="font-size:12px;color:${C.faint};">${label}</div>
      <div style="font-size:14px;line-height:20px;color:${C.text};padding-top:2px;">${value}</div>
    </div>`;

  return `
    <tr><td style="padding:16px 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.soft};border:1px solid ${C.border};border-radius:10px;">
        <tr>
          <td class="stack" width="50%" valign="top" style="padding:16px 16px 6px;">
            ${sectionTitle('Người nhận')}
            ${field('Họ tên', escapeHtml(order.customerName))}
            ${field('Điện thoại', escapeHtml(order.customerPhone))}
            ${field('Địa chỉ', order.address ? multiline(order.address) : '<span style="color:#8c9ab3;">Không cần giao hàng</span>')}
          </td>
          <td class="stack" width="50%" valign="top" style="padding:16px 16px 6px;">
            ${sectionTitle('Đơn hàng')}
            ${field('Mã đơn', `<strong style="font-family:Consolas,Menlo,monospace;">${escapeHtml(order.code)}</strong>`)}
            ${field('Ngày đặt', formatDateTime(order.createdAt))}
            ${field('Thanh toán', `${PAYMENT_METHOD_LABELS[order.paymentMethod]}<br>${badge}`)}
          </td>
        </tr>
        ${
          order.note
            ? `<tr><td colspan="2" style="padding:0 16px 10px;">${field('Ghi chú của bạn', multiline(order.note))}</td></tr>`
            : ''
        }
      </table>
    </td></tr>`;
}

/** Hướng dẫn chuyển khoản — chỉ khi đơn còn sống, chọn chuyển khoản và chưa trả. */
function needsBankTransfer(order: Order): boolean {
  return (
    order.paymentMethod === 'bank_transfer' &&
    order.paymentStatus === 'unpaid' &&
    order.status !== 'cancelled' &&
    order.status !== 'completed'
  );
}

function bankBox(order: Order, brand: MailBrand): string {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:5px 0;font-size:13px;color:${C.muted};${FONT}">${label}</td>
      <td align="right" style="padding:5px 0;font-size:14px;font-weight:700;color:${C.text};${FONT}">${value}</td>
    </tr>`;

  return `
    <tr><td style="padding:16px 32px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:2px dashed #ddae33;border-radius:10px;background:#fdf8ec;">
        <tr>
          <td class="stack" width="132" valign="top" align="center" style="padding:16px;">
            <img src="${escapeHtml(absoluteUrl(brand, brand.bankQrPath))}" width="116" height="116" alt="Mã QR chuyển khoản" style="display:block;width:116px;height:116px;border-radius:8px;background:#fff;border:1px solid ${C.border};">
            <div style="padding-top:6px;font-size:11px;color:${C.muted};${FONT}">Quét bằng app ngân hàng</div>
          </td>
          <td class="stack" valign="top" style="padding:16px 16px 16px 0;">
            <div style="font-size:15px;font-weight:700;color:#875a18;padding-bottom:6px;${FONT}">Thông tin chuyển khoản</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              ${row('Ngân hàng', escapeHtml(brand.bank.bankName))}
              ${row('Số tài khoản', `<span style="font-family:Consolas,Menlo,monospace;">${escapeHtml(brand.bank.accountNumber)}</span>`)}
              ${row('Chủ tài khoản', escapeHtml(brand.bank.accountName))}
              ${row('Số tiền', formatVnd(order.total))}
              ${row('Nội dung', `<span style="font-family:Consolas,Menlo,monospace;color:#c0392b;">${escapeHtml(order.code)}</span>`)}
            </table>
            <div style="padding-top:8px;font-size:12px;line-height:18px;color:${C.muted};${FONT}">Ghi <strong>đúng nội dung là mã đơn</strong> để chúng tôi xác nhận thanh toán nhanh nhất.</div>
          </td>
        </tr>
      </table>
    </td></tr>`;
}

/* ─────────────────────────────── Ghép lại ─────────────────────────────── */

export function renderOrderEmail(
  kind: OrderEmailKind,
  order: Order,
  brand: MailBrand,
  options: OrderEmailOptions = {},
): RenderedEmail {
  const copy = copyFor(kind, order);
  const { tone } = copy;
  const note = options.note?.trim() || null;
  const subject = `[${brand.shortName}] ${copy.subject}`;
  const preheader = htmlToText(copy.intro);

  // Khách có tài khoản thì xem lại đơn ở trang cá nhân; khách vãng lai thì
  // không có trang nào để xem — mời liên hệ.
  const cta = order.userEmail
    ? { href: `${brand.siteUrl}/dashboard`, label: 'Xem chi tiết đơn hàng' }
    : { href: `${brand.siteUrl}/lien-he`, label: 'Liên hệ hỗ trợ' };

  const html = renderShell({
    brand,
    subject,
    preheader,
    tone,
    headerRight: `Đơn <span style="color:#ffffff;font-weight:700;font-family:Consolas,Menlo,monospace;">${escapeHtml(order.code)}</span>`,
    body: `${heading(tone, copy.eyebrow, copy.title, copy.intro)}
        ${progress(order, tone)}
        ${note ? noteBox(copy.noteLabel, note, tone) : ''}
        ${needsBankTransfer(order) && kind !== 'payment_received' ? bankBox(order, brand) : ''}
        ${itemsTable(order, brand)}
        ${infoGrid(order)}
        ${button(cta.href, cta.label, C.brand)}`,
    reason: 'Bạn nhận email này vì đã đặt hàng tại',
  });

  return {
    subject,
    preheader,
    html,
    text: renderText(kind, order, brand, copy, note, cta),
  };
}

/** Bản chữ thuần — cho hộp thư không hiện HTML và giúp tránh bị chấm spam. */
function renderText(
  kind: OrderEmailKind,
  order: Order,
  brand: MailBrand,
  copy: Copy,
  note: string | null,
  cta: { href: string; label: string },
): string {
  const lines: string[] = [
    copy.title.toUpperCase(),
    '',
    htmlToText(copy.intro),
    '',
  ];

  if (note) lines.push(`${copy.noteLabel}: ${note}`, '');

  if (needsBankTransfer(order) && kind !== 'payment_received') {
    lines.push(
      'THÔNG TIN CHUYỂN KHOẢN',
      `  Ngân hàng:     ${brand.bank.bankName}`,
      `  Số tài khoản:  ${brand.bank.accountNumber}`,
      `  Chủ tài khoản: ${brand.bank.accountName}`,
      `  Số tiền:       ${formatVnd(order.total)}`,
      `  Nội dung:      ${order.code}`,
      '',
    );
  }

  lines.push(`SẢN PHẨM (${order.itemCount})`);
  for (const item of order.items) {
    lines.push(
      `  - ${item.productName}${item.sku ? ` [${item.sku}]` : ''}`,
      `    ${item.quantity} × ${formatVnd(item.unitPrice)} = ${formatVnd(item.lineTotal)}`,
    );
  }
  lines.push(`  Tạm tính:   ${formatVnd(order.subtotal)}`);
  if (order.discount > 0) {
    lines.push(`  Khuyến mãi: −${formatVnd(order.discount)}`);
  }
  lines.push(
    `  TỔNG CỘNG:  ${formatVnd(order.total)}`,
    '',
    'THÔNG TIN ĐƠN HÀNG',
    `  Mã đơn:     ${order.code}`,
    `  Ngày đặt:   ${formatDateTime(order.createdAt)}`,
    `  Người nhận: ${order.customerName} — ${order.customerPhone}`,
    `  Địa chỉ:    ${order.address ?? 'Không cần giao hàng'}`,
    `  Thanh toán: ${PAYMENT_METHOD_LABELS[order.paymentMethod]} (${PAYMENT_STATUS_LABELS[order.paymentStatus]})`,
  );
  if (order.note) lines.push(`  Ghi chú:    ${order.note}`);

  lines.push('', `${cta.label}: ${cta.href}`, '', ...textFooter(brand));

  return lines.join('\n');
}
