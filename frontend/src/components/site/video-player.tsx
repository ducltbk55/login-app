"use client";

import { useState } from "react";

import { embedUrl, youtubeThumbnail, type ParsedVideo } from "@/lib/video";

/**
 * Trình phát video giới thiệu, khung 16:9.
 *
 * YouTube hiện ảnh đại diện + nút phát trước, bấm mới tải player (player
 * YouTube nặng ~1MB và đặt cookie — không đáng tải cho mọi lượt xem trang).
 * Vimeo không có ảnh đại diện công khai dựng sẵn nên nhúng thẳng, tải lười.
 */
export function VideoPlayer({
  video,
  title,
  className = "",
}: {
  video: ParsedVideo;
  title: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const frame = `relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${className}`;

  if (video.kind === "file") {
    return (
      <div className={frame}>
        <video
          src={video.src}
          controls
          preload="metadata"
          playsInline
          className="size-full"
          aria-label={title}
        />
      </div>
    );
  }

  if (video.kind === "youtube" && !playing) {
    return (
      <button
        type="button"
        onClick={() => setPlaying(true)}
        aria-label={`Phát video: ${title}`}
        className={`${frame} group block cursor-pointer`}
      >
        {/* Ảnh từ i.ytimg.com — tên miền ngoài, không qua next/image. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={youtubeThumbnail(video.id)}
          alt=""
          className="size-full object-cover opacity-90 transition group-hover:opacity-100"
        />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-red-600 text-white shadow-lg transition group-hover:scale-110">
            <svg viewBox="0 0 24 24" className="ml-1 size-7" fill="currentColor" aria-hidden>
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
          </span>
        </span>
      </button>
    );
  }

  return (
    <div className={frame}>
      <iframe
        src={embedUrl(video, video.kind === "youtube")}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 size-full border-0"
      />
    </div>
  );
}
