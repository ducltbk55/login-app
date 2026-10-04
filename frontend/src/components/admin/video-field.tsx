"use client";

import { useState } from "react";

import { VideoPlayer } from "@/components/site/video-player";
import { INPUT, LABEL_TEXT } from "@/lib/styles";
import { parseVideoUrl, VIDEO_URL_HINT } from "@/lib/video";

/**
 * Link video giới thiệu + xem trước ngay khi dán: admin thấy đúng thứ khách
 * sẽ thấy, và biết ngay link có nhúng được không trước khi bấm Lưu.
 */
export function VideoField({
  name,
  defaultValue,
  title,
}: {
  name: string;
  defaultValue?: string | null;
  /** Tên sản phẩm, làm tiêu đề cho player. */
  title?: string;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const trimmed = url.trim();
  const video = trimmed ? parseVideoUrl(trimmed) : null;
  const invalid = trimmed !== "" && video === null;

  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Link video</span>
        <input
          name={name}
          type="url"
          inputMode="url"
          maxLength={500}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          aria-invalid={invalid || undefined}
          className={`${INPUT} ${invalid ? "border-red-500 focus-visible:border-red-500" : ""}`}
        />
        <span
          className={`mt-1.5 block text-xs ${
            invalid ? "text-red-600 dark:text-red-400" : "text-admin-muted"
          }`}
          role={invalid ? "alert" : undefined}
        >
          {invalid
            ? `Link này chưa nhúng được. ${VIDEO_URL_HINT}`
            : `${VIDEO_URL_HINT} Có video thì trang chi tiết thêm tab “Video”.`}
        </span>
      </label>

      {video && (
        <div>
          <p className={`mb-1.5 text-xs ${LABEL_TEXT}`}>Xem trước</p>
          <VideoPlayer
            // key: đổi link thì dựng lại player, không giữ trạng thái đang phát.
            key={trimmed}
            video={video}
            title={title || "Video giới thiệu sản phẩm"}
            className="max-w-xl rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
