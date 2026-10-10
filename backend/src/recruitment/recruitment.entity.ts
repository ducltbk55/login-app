/**
 * Phân hệ tuyển dụng gồm ba lớp:
 *
 *   Đợt tuyển dụng (batch)  — một chiến dịch có ngày mở / đóng
 *     └─ Vị trí (job)        — chức danh cần tuyển trong đợt đó
 *          └─ Ứng viên       — hồ sơ nộp vào một vị trí, kèm CV
 *
 * Trang ngoài chỉ nhận hồ sơ khi CẢ đợt lẫn vị trí đang mở và hôm nay nằm
 * trong khoảng ngày của đợt (xem `isAccepting`).
 */

/**
 * `draft` là đợt đang soạn, chưa hiện ở trang ngoài. `closed` là đã kết thúc
 * nhưng vẫn giữ để tra lại ứng viên của đợt đó.
 */
export const BATCH_STATUSES = ['draft', 'open', 'closed'] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

/** Vị trí tạm dừng (`closed`) giữa chừng đợt khi đã tuyển đủ người. */
export const JOB_STATUSES = ['open', 'closed'] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/**
 * Các bước của một hồ sơ. `new` tách riêng để biết hồ sơ nào chưa ai xem —
 * con số cần nhìn thấy ngay. `rejected` vẫn lưu lại, không xoá, để còn tra
 * khi ứng viên nộp lại lần sau.
 */
export const CANDIDATE_STATUSES = [
  'new',
  'screening',
  'interview',
  'offered',
  'hired',
  'rejected',
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export type Batch = {
  id: number;
  name: string;
  description: string | null;
  /** Ngày theo lịch Việt Nam, dạng YYYY-MM-DD, tính cả hai đầu. */
  startDate: string;
  endDate: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;

  /* ---- suy ra lúc đọc ---- */
  jobCount: number;
  candidateCount: number;
  /** Đang nhận hồ sơ: trạng thái `open` và hôm nay nằm trong khoảng ngày. */
  accepting: boolean;
};

/** Đợt của một vị trí, đọc kèm để khỏi gọi thêm một vòng. */
export type BatchRef = Pick<
  Batch,
  | 'id'
  | 'name'
  | 'description'
  | 'status'
  | 'startDate'
  | 'endDate'
  | 'accepting'
>;

export type Job = {
  id: number;
  batchId: number;
  batch: BatchRef;
  /** Đường dẫn trên trang ngoài: /tuyen-dung/<slug>. Duy nhất toàn bảng. */
  slug: string;
  title: string;
  department: string | null;
  level: string;
  employmentType: string;
  location: string;
  /** Chữ tự do: "18 – 30 triệu", "Thoả thuận"... */
  salary: string | null;
  openings: number;
  summary: string | null;
  /** Mỗi dòng một yêu cầu, hiện dạng gạch đầu dòng trên thẻ vị trí. */
  requirements: string[];
  /** HTML từ CKEditor, đã lọc allowlist như nội dung bài viết. */
  description: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;

  /* ---- suy ra lúc đọc ---- */
  candidateCount: number;
  /** Nhận hồ sơ được không: vị trí `open` VÀ đợt đang nhận hồ sơ. */
  accepting: boolean;
};

/** CV ứng viên gửi lên. Tên gốc chỉ để hiển thị, không bao giờ làm đường dẫn. */
export type CandidateCv = {
  name: string;
  mime: string;
  size: number;
  /** PDF xem thẳng trong trình duyệt được; Word buộc tải về. */
  inline: boolean;
};

export type CandidateEventType = 'created' | 'status' | 'interview' | 'email';

/** Kết quả gửi email: `off` = SMTP chưa cấu hình, chỉ ghi log. */
export type EmailResult = 'sent' | 'failed' | 'off';

/**
 * Nhật ký hồ sơ: chỉ thêm, không sửa — để biết ai đổi gì, lúc nào.
 *
 * Với `email`: `toValue` là loại email (received, interview…), `fromValue`
 * là kết quả gửi (`EmailResult`).
 */
export type CandidateEvent = {
  id: number;
  type: CandidateEventType;
  fromValue: string | null;
  toValue: string | null;
  actor: string | null;
  createdAt: string;
};

export type Candidate = {
  id: number;
  jobId: number;
  /** Đợt lúc nộp hồ sơ — giữ nguyên dù sau này vị trí bị chuyển đợt. */
  batchId: number;
  job: { id: number; slug: string; title: string };
  batch: { id: number; name: string };
  fullName: string;
  email: string;
  phone: string;
  experience: string | null;
  portfolioUrl: string | null;
  coverLetter: string | null;
  cv: CandidateCv;
  status: CandidateStatus;
  /** Lịch phỏng vấn (ISO), admin tự đặt. */
  interviewAt: string | null;
  /** Ghi chú nội bộ của người tuyển dụng, không gửi cho ứng viên. */
  note: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateDetail = Candidate & { events: CandidateEvent[] };

export type CandidateStats = {
  total: number;
  /** Chưa ai xem. */
  pending: number;
  interview: number;
  hired: number;
};

/** Hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD — so được thẳng với chuỗi ngày. */
export function todayInVietnam(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(now);
}

export function isBatchAccepting(
  batch: { status: string; startDate: string; endDate: string },
  today = todayInVietnam(),
): boolean {
  return (
    batch.status === 'open' &&
    batch.startDate <= today &&
    today <= batch.endDate
  );
}
