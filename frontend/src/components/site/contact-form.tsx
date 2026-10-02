"use client";

import { useState } from "react";

import { COMPANY_PROFILE } from "@/lib/company";

const FIELD =
  "w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm " +
  "outline-none transition placeholder:text-black/35 " +
  "focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400/30";

const LABEL = "mb-1.5 block text-sm font-medium text-black/70";

/**
 * Biểu mẫu liên hệ soạn sẵn email rồi mở trình gửi thư của người dùng.
 *
 * Chưa có endpoint nhận form ở backend, nên làm theo hướng này để nút bấm có
 * tác dụng thật thay vì hiện thông báo "đã gửi" giả. Khi nào có bảng lưu liên
 * hệ thì thay `onSubmit` bằng một server action.
 */
export function ContactForm() {
  const [sent, setSent] = useState(false);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const subject = String(data.get("subject") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const body = [
      `Họ tên: ${name}`,
      `Email: ${email}`,
      phone ? `Điện thoại: ${phone}` : null,
      "",
      message,
    ]
      .filter((line) => line !== null)
      .join("\n");

    window.location.href =
      `mailto:${COMPANY_PROFILE.email}` +
      `?subject=${encodeURIComponent(subject || `Liên hệ từ ${name}`)}` +
      `&body=${encodeURIComponent(body)}`;

    setSent(true);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={LABEL}>
            Họ và tên *
          </label>
          <input
            id="contact-name"
            name="name"
            required
            maxLength={120}
            placeholder="Nguyễn Văn A"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={LABEL}>
            Email *
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            maxLength={160}
            placeholder="ban@congty.vn"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-phone" className={LABEL}>
            Điện thoại
          </label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            maxLength={20}
            placeholder="09xx xxx xxx"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className={LABEL}>
            Chủ đề
          </label>
          <input
            id="contact-subject"
            name="subject"
            maxLength={160}
            placeholder="Tư vấn giải pháp"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-message" className={LABEL}>
          Nội dung *
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          maxLength={2000}
          placeholder="Mô tả ngắn gọn bài toán bạn đang gặp…"
          className={`${FIELD} resize-y`}
        />
      </div>

      <button
        type="submit"
        className="w-full cursor-pointer rounded-lg bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800 sm:w-auto"
      >
        Gửi liên hệ
      </button>

      <p
        role="status"
        className={`text-xs ${sent ? "text-gold-700" : "text-black/45"}`}
      >
        {sent
          ? `Trình gửi thư đã được mở sẵn nội dung. Nếu không thấy, hãy gửi trực tiếp tới ${COMPANY_PROFILE.email}.`
          : `Nút gửi sẽ mở trình gửi thư của bạn với nội dung đã soạn sẵn tới ${COMPANY_PROFILE.email}.`}
      </p>
    </form>
  );
}
