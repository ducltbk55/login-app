/**
 * Vòng đời một yêu cầu liên hệ.
 *
 * `new` tách khỏi `in_progress` để biết cái nào chưa ai ngó tới — đó là con số
 * duy nhất đáng báo động trên trang tổng quan. `rejected` dành cho spam hoặc
 * yêu cầu không thuộc phạm vi: vẫn lưu lại chứ không xoá, để còn đối chiếu khi
 * người gửi hỏi lại.
 */
export const CONTACT_STATUSES = [
  'new',
  'in_progress',
  'resolved',
  'rejected',
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

/** Tệp đính kèm; `null` khi người gửi không kèm gì. */
export type ContactAttachment = {
  /** Tên gốc người dùng gửi lên — chỉ để hiển thị, không bao giờ dùng làm đường dẫn. */
  name: string;
  mime: string;
  size: number;
  /** Mở xem thẳng trong trình duyệt được không (ảnh, PDF). */
  inline: boolean;
};

export type Contact = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  attachment: ContactAttachment | null;
  status: ContactStatus;
  /** Ghi chú nội bộ của admin, không gửi cho người liên hệ. */
  note: string | null;
  /** Email admin đã chuyển trạng thái gần nhất. */
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactStats = {
  total: number;
  /** Chưa ai xử lý — con số cần nhìn thấy ngay. */
  pending: number;
  inProgress: number;
  resolved: number;
};
