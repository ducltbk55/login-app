/**
 * Link video giới thiệu sản phẩm → thông tin để nhúng.
 *
 * Phải khớp với backend/src/common/video.ts (backend dùng để chặn link lạ lúc
 * lưu). Khi nhúng KHÔNG dùng thẳng URL admin nhập: chỉ dựng lại địa chỉ
 * player từ ID đã qua regex, nên không chèn được gì lạ vào iframe.
 */
export type ParsedVideo =
  | { kind: "youtube"; id: string }
  | { kind: "vimeo"; id: string }
  | { kind: "file"; src: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

export function parseVideoUrl(raw: string): ParsedVideo | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    return YOUTUBE_ID.test(parts[0] ?? "")
      ? { kind: "youtube", id: parts[0] }
      : null;
  }
  if (YOUTUBE_HOSTS.has(host)) {
    const id =
      parts[0] === "watch"
        ? url.searchParams.get("v")
        : ["shorts", "embed", "live"].includes(parts[0] ?? "")
          ? parts[1]
          : null;
    return id && YOUTUBE_ID.test(id) ? { kind: "youtube", id } : null;
  }

  if (host === "vimeo.com" || host === "www.vimeo.com") {
    return VIMEO_ID.test(parts[0] ?? "")
      ? { kind: "vimeo", id: parts[0] }
      : null;
  }
  if (host === "player.vimeo.com" && parts[0] === "video") {
    return VIMEO_ID.test(parts[1] ?? "")
      ? { kind: "vimeo", id: parts[1] }
      : null;
  }

  if (url.protocol === "https:" && /\.(mp4|webm)$/i.test(url.pathname)) {
    return { kind: "file", src: url.toString() };
  }
  return null;
}

/**
 * Địa chỉ player. YouTube dùng tên miền "nocookie": không đặt cookie theo dõi
 * cho tới khi khách bấm phát.
 */
export function embedUrl(video: ParsedVideo, autoplay = false): string {
  if (video.kind === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${video.id}?rel=0${autoplay ? "&autoplay=1" : ""}`;
  }
  if (video.kind === "vimeo") {
    return `https://player.vimeo.com/video/${video.id}${autoplay ? "?autoplay=1" : ""}`;
  }
  return video.src;
}

/** Ảnh đại diện YouTube dựng sẵn — để hiện trước, chưa tải player nặng. */
export function youtubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export const VIDEO_URL_HINT =
  "Link YouTube (kể cả Shorts), Vimeo, hoặc file .mp4/.webm qua https.";
