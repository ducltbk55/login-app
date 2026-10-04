"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitContactAction,
  type ContactFormState,
} from "@/app/(site)/lien-he/actions";
import { COMPANY_PROFILE } from "@/lib/company";
import {
  ALLOWED_ATTACHMENT_LABEL,
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  formatBytes,
} from "@/lib/contacts";

const FIELD =
  "w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm " +
  "outline-none transition placeholder:text-black/35 " +
  "focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400/30";

const LABEL = "mb-1.5 block text-sm font-medium text-black/70";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full cursor-pointer rounded-lg bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {pending ? "Đang gửi…" : "Gửi liên hệ"}
    </button>
  );
}

/** Ô chọn tệp: tự kiểm tra ngay để người dùng biết liền, khỏi chờ gửi lên. */
function AttachmentField() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clear = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;
    if (!picked) return clear();

    if (picked.size > MAX_ATTACHMENT_BYTES) {
      setError(
        `Tệp nặng ${formatBytes(picked.size)}, vượt quá giới hạn 5MB.`,
      );
      setFile(null);
      return;
    }
    if (!ALLOWED_ATTACHMENT_TYPES.includes(picked.type)) {
      setError("Định dạng này không được hỗ trợ.");
      setFile(null);
      return;
    }

    setError(null);
    setFile(picked);
  };

  return (
    <div>
      <label htmlFor="contact-attachment" className={LABEL}>
        Tệp đính kèm
      </label>

      <input
        ref={inputRef}
        id="contact-attachment"
        name="attachment"
        type="file"
        accept={ALLOWED_ATTACHMENT_TYPES.join(",")}
        onChange={onChange}
        aria-describedby="contact-attachment-help"
        className={`${FIELD} cursor-pointer py-2 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-ink-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-ink-800`}
      />

      {file && (
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/60">
          <span className="rounded-full bg-gold-100 px-2.5 py-0.5 font-medium text-gold-800">
            {file.name}
          </span>
          <span>{formatBytes(file.size)}</span>
          <button
            type="button"
            onClick={clear}
            className="cursor-pointer font-medium text-black/45 underline underline-offset-2 transition hover:text-black/70"
          >
            Bỏ tệp
          </button>
        </p>
      )}

      <p
        id="contact-attachment-help"
        className={`mt-1.5 text-xs ${error ? "text-red-600" : "text-black/45"}`}
        role={error ? "alert" : undefined}
      >
        {error ?? `Tối đa 5MB. Nhận ${ALLOWED_ATTACHMENT_LABEL}.`}
      </p>
    </div>
  );
}

// Không đặt trong actions.ts: file "use server" chỉ được export hàm async.
const EMPTY_CONTACT_STATE: ContactFormState = { status: "idle" };

/**
 * Biểu mẫu liên hệ: gửi thẳng vào hệ thống qua server action, lưu lại cùng tệp
 * đính kèm để bộ phận phụ trách xử lý trong trang quản trị.
 */
export function ContactForm({
  initialSubject,
  initialMessage,
}: {
  /** Điền sẵn khi khách đến từ giỏ hàng / nút "Liên hệ báo giá". */
  initialSubject?: string;
  initialMessage?: string;
} = {}) {
  const [state, formAction] = useActionState(
    submitContactAction,
    EMPTY_CONTACT_STATE,
  );

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-gold-300 bg-gold-50/70 p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-ink-900 text-xl text-gold-300">
          ✓
        </div>
        <h3 className="mt-4 text-lg font-semibold">Đã nhận được liên hệ</h3>
        <p className="mt-2 text-sm text-black/65">
          Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi qua email trong giờ làm
          việc. Nếu gấp, gọi trực tiếp {COMPANY_PROFILE.phone}.
        </p>
      </div>
    );
  }

  // `key` đổi theo trạng thái để React dựng lại các ô khi gửi hỏng, nhờ vậy
  // defaultValue lấy được nội dung vừa nhập thay vì ô trống.
  return (
    <form action={formAction} className="space-y-4">
      {/* Bẫy bot: người thật không nhìn thấy nên không bao giờ điền */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Để trống ô này</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

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
            defaultValue={state.values?.name}
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
            defaultValue={state.values?.email}
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
            maxLength={32}
            defaultValue={state.values?.phone}
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
            defaultValue={state.values?.subject ?? initialSubject}
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
          maxLength={5000}
          defaultValue={state.values?.message ?? initialMessage}
          placeholder="Mô tả ngắn gọn bài toán bạn đang gặp…"
          className={`${FIELD} resize-y`}
        />
      </div>

      <AttachmentField />

      {state.status === "error" && state.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <SubmitButton />

      <p className="text-xs text-black/45">
        Thông tin bạn gửi chỉ dùng để liên hệ lại và không chia sẻ cho bên thứ
        ba. Bạn cũng có thể viết thẳng tới {COMPANY_PROFILE.email}.
      </p>
    </form>
  );
}
