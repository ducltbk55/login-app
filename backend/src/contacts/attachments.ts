import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

/** Tối đa 5MB — đủ cho ảnh chụp màn hình, hồ sơ năng lực, file yêu cầu. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/**
 * Chỉ nhận đúng những định dạng dưới đây.
 *
 * Dùng allowlist chứ không phải blocklist: định dạng nguy hiểm thì vô kể, còn
 * định dạng người ta thực sự gửi kèm khi liên hệ thì đếm được trên đầu ngón tay.
 *
 * SVG CỐ Ý không có trong danh sách. SVG là XML, trình duyệt chạy
 * `<script>` bên trong khi mở trực tiếp — một người lạ gửi lên là có XSS ngay
 * trên tên miền của mình. Ảnh thì đã có PNG/JPG/WebP lo.
 */
const ALLOWED: Record<string, { ext: string; inline: boolean }> = {
  // `inline: true` = mở xem thẳng trong trình duyệt được, không có mã chạy được
  'image/jpeg': { ext: '.jpg', inline: true },
  'image/png': { ext: '.png', inline: true },
  'image/gif': { ext: '.gif', inline: true },
  'image/webp': { ext: '.webp', inline: true },
  'application/pdf': { ext: '.pdf', inline: true },

  // Phần còn lại luôn tải về, không mở trong trang
  'text/plain': { ext: '.txt', inline: false },
  'text/csv': { ext: '.csv', inline: false },
  'application/msword': { ext: '.doc', inline: false },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
    ext: '.docx',
    inline: false,
  },
  'application/vnd.ms-excel': { ext: '.xls', inline: false },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
    ext: '.xlsx',
    inline: false,
  },
  'application/zip': { ext: '.zip', inline: false },
};

export const ALLOWED_MIME_TYPES = Object.keys(ALLOWED);

/** Nhãn gọn cho thông báo lỗi và chú thích dưới ô chọn tệp. */
export const ALLOWED_EXTENSIONS = [
  ...new Set(Object.values(ALLOWED).map((entry) => entry.ext.slice(1))),
].join(', ');

export function isAllowedMime(mime: string): boolean {
  return mime in ALLOWED;
}

/** Mở xem thẳng trong trình duyệt được không, hay bắt buộc phải tải về. */
export function isInlineSafe(mime: string): boolean {
  return ALLOWED[mime]?.inline ?? false;
}

/**
 * Tên file lưu trên đĩa, sinh hoàn toàn từ phía mình.
 *
 * Tên người dùng gửi lên KHÔNG bao giờ chạm tới hệ thống tệp: nó có thể là
 * `../../.env`, có thể dài 4000 ký tự, có thể chứa ký tự Windows không nhận.
 * Tên gốc chỉ được lưu trong DB để hiển thị lại cho admin.
 */
export function storageName(mime: string): string {
  return `${randomUUID()}${ALLOWED[mime]?.ext ?? '.bin'}`;
}

/**
 * Chặn thoát khỏi thư mục lưu trữ. Tên file vốn do `storageName` sinh ra nên
 * đã an toàn, nhưng nó đi một vòng qua DB rồi quay lại — kiểm tra lại ở đây
 * thì một bản ghi bị sửa bậy cũng không đọc được file ngoài thư mục.
 */
export function resolveInsideDir(dir: string, fileName: string): string {
  const full = path.resolve(dir, fileName);
  const base = path.resolve(dir);

  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new BadRequestException('Đường dẫn tệp không hợp lệ');
  }
  return full;
}

/**
 * Sửa mã hoá tên tệp do busboy trả về.
 *
 * busboy giải mã tham số `filename` trong Content-Disposition theo latin1
 * (mặc định của nó), nên "Báo cáo quý 1.pdf" về tới đây thành
 * "BÃ¡o cÃ¡o quÃ½ 1.pdf". Dựng lại đúng dãy byte rồi đọc theo UTF-8.
 *
 * Tên thuần ASCII đi qua phép này không đổi. Nếu dãy byte hoá ra không phải
 * UTF-8 hợp lệ thì kết quả chứa ký tự thay thế — lúc đó giữ nguyên bản gốc
 * còn hơn trả về một chuỗi đầy dấu hỏi.
 */
export function decodeUploadName(raw: string): string {
  const decoded = Buffer.from(raw, 'latin1').toString('utf8');
  return decoded.includes('\ufffd') ? raw : decoded;
}

/** Tên file tiếng Việt cần cả dạng ASCII dự phòng lẫn dạng RFC 5987. */
export function contentDisposition(name: string, inline: boolean): string {
  const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
  const encoded = encodeURIComponent(name);
  return `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * Tên gốc dùng để hiển thị và đặt trong Content-Disposition.
 * Bỏ ký tự điều khiển, dấu nháy kép và ký tự tách đường dẫn.
 */
export function safeDisplayName(original: string): string {
  const base = decodeUploadName(original).split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f"\\]/g, '').trim();
  return cleaned.slice(0, 160) || 'tep-dinh-kem';
}
