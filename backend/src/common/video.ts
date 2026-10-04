/**
 * Link video giới thiệu sản phẩm. Chỉ nhận vài dạng biết cách nhúng an toàn:
 * frontend KHÔNG nhúng thẳng URL admin nhập mà dựng lại địa chỉ player từ ID
 * đã kiểm tra ở đây (xem frontend/src/lib/video.ts — hai bản phải khớp nhau).
 */
export type ParsedVideo =
  | { kind: 'youtube'; id: string }
  | { kind: 'vimeo'; id: string }
  | { kind: 'file'; src: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
]);

export function parseVideoUrl(raw: string): ParsedVideo | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);

  if (host === 'youtu.be') {
    return YOUTUBE_ID.test(parts[0] ?? '')
      ? { kind: 'youtube', id: parts[0] }
      : null;
  }
  if (YOUTUBE_HOSTS.has(host)) {
    // /watch?v=ID, /shorts/ID, /embed/ID, /live/ID
    const id =
      parts[0] === 'watch'
        ? url.searchParams.get('v')
        : ['shorts', 'embed', 'live'].includes(parts[0] ?? '')
          ? parts[1]
          : null;
    return id && YOUTUBE_ID.test(id) ? { kind: 'youtube', id } : null;
  }

  if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    return VIMEO_ID.test(parts[0] ?? '')
      ? { kind: 'vimeo', id: parts[0] }
      : null;
  }
  if (host === 'player.vimeo.com' && parts[0] === 'video') {
    return VIMEO_ID.test(parts[1] ?? '')
      ? { kind: 'vimeo', id: parts[1] }
      : null;
  }

  // File video trực tiếp: chỉ https, đuôi trình duyệt phát được.
  if (url.protocol === 'https:' && /\.(mp4|webm)$/i.test(url.pathname)) {
    return { kind: 'file', src: url.toString() };
  }
  return null;
}
