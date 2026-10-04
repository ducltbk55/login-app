"use client";

import { useRef, useState } from "react";

import { BUTTON, INPUT, LABEL_TEXT } from "@/lib/styles";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

/**
 * Một ảnh (ảnh bìa bài viết, ảnh sản phẩm): tải lên hoặc dán link. Cả hai
 * cách đều kết thúc ở cùng một ô chứa URL, nên server action và backend không
 * cần biết ảnh đến từ đâu.
 *
 * Ảnh được tải lên ngay khi chọn (không đợi bấm Lưu): form bài viết gửi qua
 * server action vốn giới hạn 1MB, và nhờ vậy xem trước được ảnh thật.
 */
export function CoverImageField({
  defaultValue,
  name = "coverImage",
  label = "Ảnh bìa",
  uploadUrl,
  emptyHint = "Bỏ trống thì trang ngoài hiện khối màu thay ảnh.",
}: {
  defaultValue?: string | null;
  name?: string;
  label?: string;
  /** Route nhận ảnh của khu admin, vd. /admin/articles/images. */
  uploadUrl: string;
  emptyHint?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ảnh link ngoài có thể hỏng; ẩn khung xem trước thay vì hiện ảnh vỡ.
  const [broken, setBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);

    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Chỉ nhận ảnh JPG, PNG, GIF, WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ảnh vượt quá 5MB.");
      return;
    }

    const body = new FormData();
    body.set("upload", file);

    setUploading(true);
    try {
      const response = await fetch(uploadUrl, { method: "POST", body });
      const data = (await response.json().catch(() => null)) as
        | { url?: string; error?: { message?: string } }
        | null;

      if (!response.ok || !data?.url) {
        setError(data?.error?.message ?? "Không tải được ảnh lên. Thử lại sau.");
        return;
      }
      setBroken(false);
      setUrl(data.url);
    } catch {
      setError("Không kết nối được máy chủ. Thử lại sau.");
    } finally {
      setUploading(false);
      // Cho phép chọn lại đúng tệp vừa chọn (onChange mới bắn lại).
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="block text-sm">
      <span className={`mb-1.5 block ${LABEL_TEXT}`}>{label}</span>

      {url && !broken ? (
        <div className="relative mb-3 overflow-hidden rounded-lg border border-admin-border bg-admin-surface-2">
          {/* URL tuỳ ý (có thể là link ngoài) nên dùng img thường. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={label}
            onError={() => setBroken(true)}
            className="aspect-video w-full object-cover"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files[0];
            if (file) void upload(file);
          }}
          className="mb-3 flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-admin-border bg-admin-surface-2 text-xs text-admin-muted transition hover:border-brand-300 disabled:opacity-60"
        >
          {uploading ? (
            "Đang tải ảnh lên…"
          ) : (
            <>
              <span className="font-medium">Bấm hoặc kéo ảnh vào đây</span>
              <span>JPG, PNG, GIF, WebP · tối đa 5MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      {url && (
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className={`${BUTTON.secondary} flex-1`}
          >
            {uploading ? "Đang tải…" : "Đổi ảnh"}
          </button>
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setBroken(false);
              setError(null);
            }}
            disabled={uploading}
            className={`${BUTTON.secondary} flex-1`}
          >
            Bỏ ảnh
          </button>
        </div>
      )}

      <input
        name={name}
        maxLength={500}
        value={url}
        onChange={(event) => {
          setUrl(event.target.value.trim());
          setBroken(false);
          setError(null);
        }}
        placeholder="…hoặc dán link ảnh: https://..."
        className={INPUT}
      />

      {error ? (
        <span
          role="alert"
          className="mt-1.5 block text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </span>
      ) : (
        <span className="mt-1.5 block text-xs text-admin-muted">
          {url && broken
            ? "Không xem trước được ảnh từ link này — kiểm tra lại đường dẫn."
            : emptyHint}
        </span>
      )}
    </div>
  );
}
