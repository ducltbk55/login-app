"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import type { ApplyFormState } from "@/app/(site)/tuyen-dung/[slug]/actions";
import { formatBytes } from "@/lib/contacts";
import {
  CV_LABEL,
  CV_MIME_TYPES,
  EXPERIENCE_OPTIONS,
  MAX_CV_BYTES,
} from "@/lib/recruitment";

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
      {pending ? "Đang gửi hồ sơ…" : "Nộp hồ sơ"}
    </button>
  );
}

/** Ô chọn CV: kiểm tra ngay khi chọn, khỏi chờ gửi lên mới biết sai. */
function CvField() {
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

    if (picked.size > MAX_CV_BYTES) {
      setError(`Tệp nặng ${formatBytes(picked.size)}, vượt quá giới hạn 5MB.`);
      setFile(null);
      return;
    }
    if (!CV_MIME_TYPES.includes(picked.type)) {
      setError(`CV chỉ nhận định dạng ${CV_LABEL}.`);
      setFile(null);
      return;
    }
    setError(null);
    setFile(picked);
  };

  return (
    <div>
      <label htmlFor="apply-cv" className={LABEL}>
        CV *
      </label>
      <input
        ref={inputRef}
        id="apply-cv"
        name="cv"
        type="file"
        required
        accept={CV_MIME_TYPES.join(",")}
        onChange={onChange}
        aria-describedby="apply-cv-help"
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
        id="apply-cv-help"
        className={`mt-1.5 text-xs ${error ? "text-red-600" : "text-black/45"}`}
        role={error ? "alert" : undefined}
      >
        {error ?? `Tối đa 5MB. Nhận ${CV_LABEL}.`}
      </p>
    </div>
  );
}

// Không đặt trong actions.ts: file "use server" chỉ được export hàm async.
const EMPTY_STATE: ApplyFormState = { status: "idle" };

export function ApplyForm({
  jobTitle,
  action,
}: {
  jobTitle: string;
  action: (
    state: ApplyFormState,
    formData: FormData,
  ) => Promise<ApplyFormState>;
}) {
  const [state, formAction] = useActionState(action, EMPTY_STATE);

  if (state.status === "sent") {
    return (
      <div className="rounded-2xl border border-gold-300 bg-gold-50/70 p-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-ink-900 text-xl text-gold-300">
          ✓
        </div>
        <h3 className="mt-4 text-lg font-semibold">Đã nhận hồ sơ của bạn</h3>
        <p className="mt-2 text-sm text-black/65">
          Cảm ơn bạn đã ứng tuyển vị trí <strong>{jobTitle}</strong>. Bộ phận
          tuyển dụng sẽ xem hồ sơ và liên hệ qua email hoặc điện thoại nếu phù
          hợp.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {/* Bẫy bot: người thật không nhìn thấy nên không bao giờ điền */}
      <div
        aria-hidden
        className="absolute left-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="apply-website">Để trống ô này</label>
        <input
          id="apply-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label htmlFor="apply-name" className={LABEL}>
          Họ và tên *
        </label>
        <input
          id="apply-name"
          name="fullName"
          required
          maxLength={120}
          autoComplete="name"
          defaultValue={state.values?.fullName}
          placeholder="Nguyễn Văn A"
          className={FIELD}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="apply-email" className={LABEL}>
            Email *
          </label>
          <input
            id="apply-email"
            name="email"
            type="email"
            required
            maxLength={160}
            autoComplete="email"
            defaultValue={state.values?.email}
            placeholder="ban@email.com"
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="apply-phone" className={LABEL}>
            Điện thoại *
          </label>
          <input
            id="apply-phone"
            name="phone"
            type="tel"
            required
            maxLength={20}
            autoComplete="tel"
            defaultValue={state.values?.phone}
            placeholder="09xx xxx xxx"
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="apply-experience" className={LABEL}>
            Kinh nghiệm
          </label>
          <select
            id="apply-experience"
            name="experience"
            defaultValue={state.values?.experience ?? ""}
            className={`${FIELD} cursor-pointer`}
          >
            <option value="">— Chọn —</option>
            {EXPERIENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="apply-portfolio" className={LABEL}>
            Portfolio / LinkedIn / GitHub
          </label>
          <input
            id="apply-portfolio"
            name="portfolioUrl"
            type="url"
            maxLength={300}
            defaultValue={state.values?.portfolioUrl}
            placeholder="https://"
            className={FIELD}
          />
        </div>
      </div>

      <CvField />

      <div>
        <label htmlFor="apply-letter" className={LABEL}>
          Thư giới thiệu
        </label>
        <textarea
          id="apply-letter"
          name="coverLetter"
          rows={5}
          maxLength={5000}
          defaultValue={state.values?.coverLetter}
          placeholder="Vài dòng về bạn và lý do bạn quan tâm vị trí này…"
          className={`${FIELD} resize-y`}
        />
      </div>

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
        Thông tin và CV của bạn chỉ dùng cho việc tuyển dụng và không chia sẻ
        cho bên thứ ba.
      </p>
    </form>
  );
}
