"use client";

import { useRef, useState } from "react";

import { CloseIcon } from "@/components/admin/icons";
import { BUTTON, BUTTON_SM, INPUT } from "@/lib/styles";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/gif,image/webp";

/**
 * Bộ sưu tập ảnh: tải lên nhiều ảnh một lúc hoặc dán link, kéo thả (hoặc bấm
 * mũi tên) để sắp thứ tự, bấm ✕ để bỏ.
 *
 * Danh sách URL đi lên server qua một input ẩn dạng JSON. Ảnh được tải lên
 * ngay khi chọn — form gửi qua server action vốn giới hạn 1MB.
 */
export function GalleryField({
  name,
  defaultValue = [],
  uploadUrl,
  max,
}: {
  name: string;
  defaultValue?: string[];
  /** Route nhận ảnh của khu admin, vd. /admin/products/images. */
  uploadUrl: string;
  max: number;
}) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [link, setLink] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const room = max - urls.length;
  const busy = progress !== null;

  /** Thêm vào cuối, bỏ trùng, không vượt giới hạn. */
  const append = (incoming: string[]) =>
    setUrls((current) =>
      [...current, ...incoming.filter((url) => !current.includes(url))].slice(
        0,
        max,
      ),
    );

  async function upload(files: File[]) {
    const problems: string[] = [];
    let picked = files;
    if (picked.length > room) {
      problems.push(`Chỉ thêm được ${room} ảnh nữa (tối đa ${max}).`);
      picked = picked.slice(0, Math.max(room, 0));
    }

    const uploaded: string[] = [];
    // Tải lần lượt: vừa báo được tiến độ, vừa không dội cả loạt request lên.
    for (const [index, file] of picked.entries()) {
      setProgress(`Đang tải ${index + 1}/${picked.length}…`);

      if (!ACCEPT.split(",").includes(file.type)) {
        problems.push(`${file.name}: chỉ nhận JPG, PNG, GIF, WebP.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name}: vượt quá 5MB.`);
        continue;
      }

      const body = new FormData();
      body.set("upload", file);
      try {
        const response = await fetch(uploadUrl, { method: "POST", body });
        const data = (await response.json().catch(() => null)) as {
          url?: string;
          error?: { message?: string };
        } | null;
        if (response.ok && data?.url) uploaded.push(data.url);
        else
          problems.push(
            `${file.name}: ${data?.error?.message ?? "không tải lên được."}`,
          );
      } catch {
        problems.push(`${file.name}: không kết nối được máy chủ.`);
      }
    }

    append(uploaded);
    setErrors(problems);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function addLink() {
    const url = link.trim();
    if (!/^https?:\/\/\S+$/.test(url)) {
      setErrors(["Link ảnh phải bắt đầu bằng http:// hoặc https://"]);
      return;
    }
    if (room <= 0) {
      setErrors([`Bộ sưu tập tối đa ${max} ảnh.`]);
      return;
    }
    append([url]);
    setLink("");
    setErrors([]);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= urls.length || from === to) return;
    setUrls((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }

  return (
    <div
      className="space-y-3 text-sm"
      // Thả tệp từ máy vào bất kỳ đâu trong khối là tải lên.
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        void upload([...event.dataTransfer.files]);
      }}
    >
      <input type="hidden" name={name} value={JSON.stringify(urls)} />

      {urls.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {urls.map((url, index) => (
            <li
              key={url}
              draggable
              onDragStart={(event) => {
                setDragFrom(index);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => {
                if (dragFrom !== null) event.preventDefault();
              }}
              onDrop={(event) => {
                if (dragFrom === null) return;
                event.preventDefault();
                event.stopPropagation();
                move(dragFrom, index);
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
              className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-admin-surface-2 active:cursor-grabbing ${
                dragFrom === index
                  ? "border-brand-400 opacity-50"
                  : "border-admin-border"
              }`}
            >
              {/* URL tuỳ ý (có thể là link ngoài) nên dùng img thường. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Ảnh ${index + 1}`}
                draggable={false}
                className="size-full object-cover"
              />
              <span className="absolute top-1.5 left-1.5 rounded bg-black/60 px-1.5 text-xs font-medium text-white tabular-nums">
                {index + 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  setUrls((current) => current.filter((u) => u !== url))
                }
                aria-label={`Bỏ ảnh ${index + 1}`}
                title="Bỏ ảnh"
                className="absolute top-1.5 right-1.5 grid size-6 cursor-pointer place-items-center rounded-full bg-black/60 text-white transition hover:bg-red-600"
              >
                <CloseIcon className="size-3.5" />
              </button>
              {/* Mũi tên cho bàn phím / màn cảm ứng, nơi kéo thả không tiện. */}
              <div className="absolute inset-x-1.5 bottom-1.5 flex justify-between opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={index === 0}
                  aria-label={`Đưa ảnh ${index + 1} lên trước`}
                  className="grid size-6 cursor-pointer place-items-center rounded-full bg-black/60 text-xs text-white disabled:invisible"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={index === urls.length - 1}
                  aria-label={`Đưa ảnh ${index + 1} ra sau`}
                  className="grid size-6 cursor-pointer place-items-center rounded-full bg-black/60 text-xs text-white disabled:invisible"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy || room <= 0}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-admin-border bg-admin-surface-2 px-4 py-6 text-xs text-admin-muted transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <span className="font-medium">{progress}</span>
        ) : room <= 0 ? (
          <span className="font-medium">Đã đủ {max} ảnh</span>
        ) : (
          <>
            <span className="font-medium">
              Bấm để chọn nhiều ảnh, hoặc kéo ảnh thả vào đây
            </span>
            <span>JPG, PNG, GIF, WebP · tối đa 5MB mỗi ảnh</span>
          </>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          if (files.length) void upload(files);
        }}
      />

      <div className="flex gap-2">
        <input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            // Enter trong ô này là thêm link, không phải gửi cả form sản phẩm.
            if (event.key === "Enter") {
              event.preventDefault();
              addLink();
            }
          }}
          placeholder="…hoặc dán link ảnh: https://..."
          className={INPUT}
        />
        <button
          type="button"
          onClick={addLink}
          disabled={busy || link.trim() === ""}
          className={`${BUTTON.secondary} ${BUTTON_SM} shrink-0`}
        >
          Thêm
        </button>
      </div>

      {errors.length > 0 ? (
        <ul
          role="alert"
          className="space-y-0.5 text-xs text-red-600 dark:text-red-400"
        >
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-admin-muted">
          {urls.length}/{max} ảnh. Kéo thả để đổi thứ tự. Có ảnh thì trang chi
          tiết chạy slideshow các ảnh này; để trống thì hiện ảnh đại diện.
        </p>
      )}
    </div>
  );
}
