"use server";

import { BackendError } from "@/lib/backend";
import {
  ALLOWED_ATTACHMENT_LABEL,
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  submitContact,
} from "@/lib/contacts";

export type ContactFormState = {
  status: "idle" | "sent" | "error";
  error?: string;
  /** Giữ lại nội dung đã gõ khi gửi hỏng, để không bắt viết lại từ đầu. */
  values?: {
    name: string;
    email: string;
    phone: string;
    subject: string;
    message: string;
  };
};

export const EMPTY_CONTACT_STATE: ContactFormState = { status: "idle" };

function text(formData: FormData, field: string): string {
  return String(formData.get(field) ?? "").trim();
}

/**
 * Nhận form Liên hệ của trang ngoài.
 *
 * Kiểm tra lại mọi thứ ở đây dù trình duyệt đã chặn: `accept` và `required`
 * của HTML chỉ là tiện lợi cho người dùng, ai cũng gửi thẳng request được.
 * Backend kiểm tra lần nữa — đây là lớp để báo lỗi tử tế, không phải lớp bảo vệ.
 */
export async function submitContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = {
    name: text(formData, "name"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    subject: text(formData, "subject"),
    message: text(formData, "message"),
  };

  const fail = (error: string): ContactFormState => ({
    status: "error",
    error,
    values,
  });

  // Bẫy bot: ô này ẩn với người thật nên chỉ máy mới điền. Giả vờ gửi thành
  // công để bot không biết đường mà thử lại kiểu khác.
  if (text(formData, "website") !== "") {
    return { status: "sent" };
  }

  if (!values.name) return fail("Vui lòng nhập họ tên.");
  if (!values.email) return fail("Vui lòng nhập email.");
  if (!values.message) return fail("Vui lòng nhập nội dung cần trao đổi.");

  const file = formData.get("attachment");
  const attachment = file instanceof File && file.size > 0 ? file : null;

  if (attachment) {
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      return fail("Tệp đính kèm vượt quá 5MB.");
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(attachment.type)) {
      return fail(`Định dạng tệp không được hỗ trợ. Chỉ nhận: ${ALLOWED_ATTACHMENT_LABEL}.`);
    }
  }

  // Dựng lại FormData chỉ với đúng các trường backend nhận: `website` là bẫy
  // bot, còn backend bật forbidNonWhitelisted nên trường lạ sẽ bị 400.
  const payload = new FormData();
  payload.set("name", values.name);
  payload.set("email", values.email);
  if (values.phone) payload.set("phone", values.phone);
  if (values.subject) payload.set("subject", values.subject);
  payload.set("message", values.message);
  if (attachment) payload.set("attachment", attachment, attachment.name);

  try {
    await submitContact(payload);
  } catch (error) {
    if (error instanceof BackendError) return fail(error.message);
    return fail("Không gửi được lúc này. Vui lòng thử lại sau ít phút.");
  }

  return { status: "sent" };
}
