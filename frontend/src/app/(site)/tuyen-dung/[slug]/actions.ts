"use server";

import { BackendError } from "@/lib/backend";
import {
  CV_LABEL,
  CV_MIME_TYPES,
  MAX_CV_BYTES,
  submitApplication,
} from "@/lib/recruitment";

export type ApplyFormState = {
  status: "idle" | "sent" | "error";
  error?: string;
  /** Giữ lại nội dung đã gõ khi gửi hỏng, để không bắt nhập lại từ đầu. */
  values?: {
    fullName: string;
    email: string;
    phone: string;
    experience: string;
    portfolioUrl: string;
    coverLetter: string;
  };
};

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/**
 * Nhận hồ sơ ứng tuyển của trang ngoài. `jobId` gắn sẵn qua `bind` ở trang,
 * không đọc từ form.
 *
 * Kiểm tra ở đây để báo lỗi tử tế; backend kiểm tra lại toàn bộ (kể cả nội
 * dung tệp CV) — đó mới là lớp bảo vệ.
 */
export async function applyAction(
  jobId: number,
  _prev: ApplyFormState,
  formData: FormData,
): Promise<ApplyFormState> {
  const values = {
    fullName: text(formData, "fullName"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    experience: text(formData, "experience"),
    portfolioUrl: text(formData, "portfolioUrl"),
    coverLetter: text(formData, "coverLetter"),
  };
  const fail = (error: string): ApplyFormState => ({
    status: "error",
    error,
    values,
  });

  // Bẫy bot: ô ẩn với người thật. Giả vờ thành công để bot không thử kiểu khác.
  if (text(formData, "website") !== "") return { status: "sent" };

  if (!values.fullName) return fail("Vui lòng nhập họ tên.");
  if (!values.email) return fail("Vui lòng nhập email.");
  if (!values.phone) return fail("Vui lòng nhập số điện thoại.");

  const file = formData.get("cv");
  const cv = file instanceof File && file.size > 0 ? file : null;
  if (!cv) return fail("Vui lòng đính kèm CV.");
  if (cv.size > MAX_CV_BYTES) return fail("CV vượt quá 5MB.");
  if (!CV_MIME_TYPES.includes(cv.type)) {
    return fail(`CV chỉ nhận định dạng ${CV_LABEL}.`);
  }

  // Dựng lại FormData với đúng các trường backend nhận (forbidNonWhitelisted).
  const payload = new FormData();
  payload.set("jobId", String(jobId));
  payload.set("fullName", values.fullName);
  payload.set("email", values.email);
  payload.set("phone", values.phone);
  if (values.experience) payload.set("experience", values.experience);
  if (values.portfolioUrl) payload.set("portfolioUrl", values.portfolioUrl);
  if (values.coverLetter) payload.set("coverLetter", values.coverLetter);
  payload.set("cv", cv, cv.name);

  try {
    await submitApplication(payload);
  } catch (error) {
    if (error instanceof BackendError) return fail(error.message);
    return fail("Không gửi được lúc này. Vui lòng thử lại sau ít phút.");
  }

  return { status: "sent" };
}
