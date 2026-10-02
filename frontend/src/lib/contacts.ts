import { request, requestOptional, requestStream, segment } from "./backend";
import type { Paginated, PageQuery } from "./categories";

export const CONTACT_STATUSES = [
  "new",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "Chưa xử lý",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý",
  rejected: "Không xử lý",
};

export type ContactAttachment = {
  /** Tên gốc người gửi đặt — chỉ để hiển thị. */
  name: string;
  mime: string;
  size: number;
  /** Ảnh và PDF mở xem thẳng được; còn lại buộc tải về. */
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
  note: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContactStats = {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
};

export type ContactQuery = PageQuery & {
  search?: string;
  status?: ContactStatus;
};

/** Giới hạn trùng với backend; hiển thị lại cho người gửi biết trước. */
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
];

export const ALLOWED_ATTACHMENT_LABEL =
  "jpg, png, gif, webp, pdf, txt, csv, doc, docx, xls, xlsx, zip";

/** Dung lượng dạng người đọc được: 1.2 MB, 340 KB… */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toQueryString(query: ContactQuery): string {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) {
    params.set("pageSize", String(query.pageSize));
  }
  return params.size > 0 ? `?${params}` : "";
}

export async function listContacts(
  query: ContactQuery = {},
): Promise<Paginated<Contact>> {
  return request<Paginated<Contact>>(`/contacts${toQueryString(query)}`);
}

export async function findContact(
  id: string | number,
): Promise<Contact | null> {
  return requestOptional<Contact>(`/contacts/${segment(id)}`);
}

export async function getContactStats(): Promise<ContactStats> {
  return request<ContactStats>("/contacts/stats");
}

/**
 * Gửi form liên hệ kèm tệp. Chuyển tiếp nguyên `FormData` xuống backend thay
 * vì đọc tệp vào bộ nhớ rồi dựng lại — ít bước, ít chỗ sai.
 */
export async function submitContact(formData: FormData): Promise<void> {
  await request<{ ok: true }>("/contacts", {
    method: "POST",
    body: formData,
  });
}

export async function updateContact(
  id: string | number,
  input: { status?: ContactStatus; note?: string | null; handledBy?: string },
): Promise<Contact> {
  return request<Contact>(`/contacts/${segment(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteContact(id: string | number): Promise<void> {
  await request<null>(`/contacts/${segment(id)}`, { method: "DELETE" });
}

/** Luồng tệp đính kèm, để route handler của admin chuyển tiếp cho trình duyệt. */
export async function contactAttachment(
  id: string | number,
): Promise<Response> {
  return requestStream(`/contacts/${segment(id)}/attachment`);
}
