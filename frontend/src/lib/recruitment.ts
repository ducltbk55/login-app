import { request, requestOptional, requestStream, segment } from "./backend";
import type { Paginated, PageQuery } from "./categories";

/* ---------------- kiểu dữ liệu (khớp backend/src/recruitment) ---------------- */

export const BATCH_STATUSES = ["draft", "open", "closed"] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  draft: "Nháp",
  open: "Đang mở",
  closed: "Đã đóng",
};

export const JOB_STATUSES = ["open", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  open: "Đang tuyển",
  closed: "Tạm dừng",
};

/** Thứ tự cũng là thứ tự các bước trên màn hình xử lý hồ sơ. */
export const CANDIDATE_STATUSES = [
  "new",
  "screening",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "Mới nộp",
  screening: "Đang sàng lọc",
  interview: "Phỏng vấn",
  offered: "Đã gửi offer",
  hired: "Đã tuyển",
  rejected: "Không phù hợp",
};

export type Batch = {
  id: number;
  name: string;
  description: string | null;
  /** YYYY-MM-DD theo lịch Việt Nam. */
  startDate: string;
  endDate: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  jobCount: number;
  candidateCount: number;
  /** Đang nhận hồ sơ: mở và hôm nay nằm trong khoảng ngày. */
  accepting: boolean;
};

export type Job = {
  id: number;
  batchId: number;
  batch: Pick<
    Batch,
    | "id"
    | "name"
    | "description"
    | "status"
    | "startDate"
    | "endDate"
    | "accepting"
  >;
  slug: string;
  title: string;
  department: string | null;
  level: string;
  employmentType: string;
  location: string;
  salary: string | null;
  openings: number;
  summary: string | null;
  requirements: string[];
  /** HTML đã được backend lọc allowlist. */
  description: string;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  candidateCount: number;
  accepting: boolean;
};

/** Email gửi ứng viên — khớp `CandidateEmailKind` của backend. */
export const CANDIDATE_EMAIL_LABELS: Record<string, string> = {
  received: "Xác nhận đã nhận hồ sơ",
  screening: "Hồ sơ đang được xem xét",
  interview: "Thư mời phỏng vấn",
  offered: "Thư mời nhận việc",
  hired: "Chào mừng trúng tuyển",
  rejected: "Thông báo kết quả",
};

export type CandidateEvent = {
  id: number;
  /** `email`: toValue = loại email, fromValue = sent | failed | off. */
  type: "created" | "status" | "interview" | "email";
  fromValue: string | null;
  toValue: string | null;
  actor: string | null;
  createdAt: string;
};

export type Candidate = {
  id: number;
  jobId: number;
  batchId: number;
  job: { id: number; slug: string; title: string };
  batch: { id: number; name: string };
  fullName: string;
  email: string;
  phone: string;
  experience: string | null;
  portfolioUrl: string | null;
  coverLetter: string | null;
  cv: { name: string; mime: string; size: number; inline: boolean };
  status: CandidateStatus;
  interviewAt: string | null;
  note: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CandidateDetail = Candidate & { events: CandidateEvent[] };

export type CandidateStats = {
  total: number;
  pending: number;
  interview: number;
  hired: number;
};

export type SaveBatchInput = {
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: BatchStatus;
};

export type SaveJobInput = {
  batchId: number;
  slug?: string;
  title: string;
  department: string | null;
  level: string;
  employmentType: string;
  location: string;
  salary: string | null;
  openings: number;
  summary: string | null;
  /** Mỗi dòng một yêu cầu. */
  requirements: string | null;
  description: string;
  status: JobStatus;
};

/* ---------------- hằng số cho form ---------------- */

/** Giới hạn trùng với backend (recruitment/cv.ts), để báo trước cho người nộp. */
export const MAX_CV_BYTES = 5 * 1024 * 1024;

export const CV_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const CV_LABEL = "pdf, doc, docx";

export const EXPERIENCE_OPTIONS = [
  "Chưa có kinh nghiệm",
  "Dưới 1 năm",
  "1 – 3 năm",
  "3 – 5 năm",
  "Trên 5 năm",
];

export const LEVEL_OPTIONS = [
  "Thực tập",
  "Fresher",
  "Junior",
  "Middle",
  "Senior",
  "Trưởng nhóm",
  "Quản lý",
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  "Toàn thời gian",
  "Bán thời gian",
  "Thực tập",
  "Hợp đồng / dự án",
  "Từ xa",
];

/** "2026-10-01" → "01/10/2026". Chuỗi ngày thuần, không qua Date để khỏi lệch múi giờ. */
export function formatDay(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/* ---------------- gọi backend ---------------- */

function toQueryString(
  query: Record<string, string | number | boolean | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "" && value !== false) {
      params.set(key, String(value));
    }
  }
  return params.size > 0 ? `?${params}` : "";
}

export type BatchQuery = PageQuery & { search?: string; status?: BatchStatus };

export async function listBatches(
  query: BatchQuery = {},
): Promise<Paginated<Batch>> {
  return request(`/recruitment/batches${toQueryString(query)}`);
}

export async function findBatch(id: string | number): Promise<Batch | null> {
  return requestOptional(`/recruitment/batches/${segment(id)}`);
}

export async function createBatch(input: SaveBatchInput): Promise<Batch> {
  return request("/recruitment/batches", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBatch(
  id: string | number,
  input: Partial<SaveBatchInput>,
): Promise<Batch> {
  return request(`/recruitment/batches/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteBatch(id: string | number): Promise<void> {
  await request<null>(`/recruitment/batches/${segment(id)}`, {
    method: "DELETE",
  });
}

export type JobQuery = PageQuery & {
  search?: string;
  batchId?: number;
  status?: JobStatus;
  /** Chỉ vị trí đang nhận hồ sơ — trang Tuyển dụng ngoài. */
  accepting?: boolean;
};

export async function listJobs(query: JobQuery = {}): Promise<Paginated<Job>> {
  return request(`/recruitment/jobs${toQueryString(query)}`);
}

export async function findJob(id: string | number): Promise<Job | null> {
  return requestOptional(`/recruitment/jobs/${segment(id)}`);
}

export async function findJobBySlug(slug: string): Promise<Job | null> {
  return requestOptional(`/recruitment/jobs/slug/${segment(slug)}`);
}

export async function createJob(input: SaveJobInput): Promise<Job> {
  return request("/recruitment/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateJob(
  id: string | number,
  input: Partial<SaveJobInput>,
): Promise<Job> {
  return request(`/recruitment/jobs/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteJob(id: string | number): Promise<void> {
  await request<null>(`/recruitment/jobs/${segment(id)}`, {
    method: "DELETE",
  });
}

export type CandidateQuery = PageQuery & {
  search?: string;
  status?: CandidateStatus;
  batchId?: number;
  jobId?: number;
};

export async function listCandidates(
  query: CandidateQuery = {},
): Promise<Paginated<Candidate>> {
  return request(`/recruitment/candidates${toQueryString(query)}`);
}

export async function getCandidateStats(
  batchId?: number,
): Promise<CandidateStats> {
  return request(`/recruitment/candidates/stats${toQueryString({ batchId })}`);
}

export async function findCandidate(
  id: string | number,
): Promise<CandidateDetail | null> {
  return requestOptional(`/recruitment/candidates/${segment(id)}`);
}

/** Nộp hồ sơ: chuyển tiếp nguyên FormData (kèm CV) xuống backend. */
export async function submitApplication(formData: FormData): Promise<void> {
  await request<{ ok: true }>("/recruitment/candidates", {
    method: "POST",
    body: formData,
  });
}

export async function updateCandidate(
  id: string | number,
  input: {
    status?: CandidateStatus;
    interviewAt?: string | null;
    note?: string | null;
    /** Gửi email báo ứng viên (backend mặc định không gửi). */
    notify?: boolean;
    /** Lời nhắn kèm email — KHÔNG phải ghi chú nội bộ. */
    message?: string | null;
    handledBy?: string;
  },
): Promise<CandidateDetail> {
  return request(`/recruitment/candidates/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteCandidate(id: string | number): Promise<void> {
  await request<null>(`/recruitment/candidates/${segment(id)}`, {
    method: "DELETE",
  });
}

/** Luồng tệp CV, để route handler của admin chuyển tiếp cho trình duyệt. */
export async function candidateCv(id: string | number): Promise<Response> {
  return requestStream(`/recruitment/candidates/${segment(id)}/cv`);
}

/** Hôm nay theo lịch Việt Nam, dạng YYYY-MM-DD — so được thẳng với ngày của đợt. */
export function todayInVietnam(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);
}

/** Số ngày còn nhận hồ sơ, tính cả hôm nay là 0. Âm = đã quá hạn. */
export function daysUntil(endDate: string, today = todayInVietnam()): number {
  const ms = Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** "Còn 12 ngày" / "Hạn cuối hôm nay" / "Đã hết hạn". */
export function deadlineLabel(endDate: string, today = todayInVietnam()): string {
  const days = daysUntil(endDate, today);
  if (days < 0) return "Đã hết hạn";
  if (days === 0) return "Hạn cuối hôm nay";
  return `Còn ${days} ngày`;
}
