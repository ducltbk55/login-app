"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "@/components/admin/icons";

/** Kéo ngang quá ngần này (px) mới tính là vuốt chuyển ảnh. */
const SWIPE_THRESHOLD = 40;

/**
 * Vuốt trái/phải bằng pointer events — chạy cho cả cảm ứng lẫn chuột, không
 * cần thư viện. Kéo dọc thì để trình duyệt cuộn trang như thường.
 */
function useSwipe(onPrev: () => void, onNext: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  // Trình duyệt vẫn bắn `click` sau khi nhả tay; vừa vuốt xong thì click đó
  // không được tính là "bấm vào ảnh".
  const justSwiped = useRef(false);

  const handlers = {
    onPointerDown: (event: React.PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
      justSwiped.current = false;
    },
    onPointerUp: (event: React.PointerEvent) => {
      if (!start.current) return;
      const dx = event.clientX - start.current.x;
      const dy = event.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      justSwiped.current = true;
      if (dx > 0) onPrev();
      else onNext();
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };

  /** Gọi trong onClick: true nghĩa là click này đến từ cú vuốt, bỏ qua. */
  const consumeSwipe = () => {
    const swiped = justSwiped.current;
    justSwiped.current = false;
    return swiped;
  };

  return { handlers, consumeSwipe };
}

function NavButton({
  direction,
  onClick,
  large = false,
}: {
  direction: "prev" | "next";
  onClick: () => void;
  large?: boolean;
}) {
  const Icon = direction === "prev" ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-label={direction === "prev" ? "Ảnh trước" : "Ảnh sau"}
      className={`absolute top-1/2 grid -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-white/90 text-ink-900 shadow-md ring-1 ring-black/10 transition hover:bg-white ${
        direction === "prev" ? "left-3" : "right-3"
      } ${large ? "size-12" : "size-10"}`}
    >
      <Icon className={large ? "size-6" : "size-5"} />
    </button>
  );
}

/**
 * Slideshow ảnh sản phẩm: ảnh lớn + dải ảnh nhỏ, bấm ảnh lớn để xem toàn
 * màn hình. Ảnh hiển thị trọn khung (object-contain) — ảnh sản phẩm bị cắt
 * mất góc là mất thông tin.
 *
 * `children` là phần phủ lên ảnh lớn (nhãn −X%).
 */
export function ProductGallery({
  images,
  alt,
  children,
}: {
  images: string[];
  alt: string;
  children?: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const thumbsRef = useRef<HTMLUListElement>(null);
  const count = images.length;

  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);
  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const swipe = useSwipe(prev, next);

  // Giữ ảnh nhỏ đang chọn luôn nằm trong vùng nhìn thấy của dải ảnh.
  useEffect(() => {
    const thumb = thumbsRef.current?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [index]);

  // Chế độ toàn màn hình: phím mũi tên / Esc, và khoá cuộn trang phía sau.
  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
      if (event.key === "ArrowLeft") prev();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [zoomed, prev, next]);

  const many = count > 1;

  return (
    <div>
      <div
        role="region"
        aria-roledescription="slideshow"
        aria-label={`Ảnh sản phẩm ${alt}`}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") prev();
          if (event.key === "ArrowRight") next();
          if (event.key === "Enter") setZoomed(true);
        }}
        {...swipe.handlers}
        className="relative touch-pan-y overflow-hidden rounded-3xl border border-black/10 bg-white outline-none select-none focus-visible:ring-2 focus-visible:ring-gold-400"
      >
        {/* Mọi ảnh nằm chồng nhau, chỉ ảnh hiện tại rõ: chuyển ảnh mờ dần
            và ảnh kế tiếp đã tải sẵn, không bị nháy trắng. */}
        <button
          type="button"
          onClick={() => {
            if (!swipe.consumeSwipe()) setZoomed(true);
          }}
          aria-label="Xem ảnh toàn màn hình"
          className="relative block h-72 w-full cursor-zoom-in sm:h-96 lg:h-[28rem]"
        >
          {images.map((src, i) => (
            // URL tuỳ ý (có thể là link ngoài) nên dùng img thường.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`${alt} — ảnh ${i + 1}/${count}`}
              draggable={false}
              // Ảnh đầu tải ngay; các ảnh sau tải lười, trừ ảnh kề ảnh đang xem.
              loading={i === 0 || Math.abs(i - index) <= 1 ? "eager" : "lazy"}
              aria-hidden={i !== index}
              className={`absolute inset-0 size-full object-contain p-2 transition-opacity duration-300 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </button>

        {children}

        {many && (
          <>
            <NavButton direction="prev" onClick={prev} />
            <NavButton direction="next" onClick={next} />
            <span
              aria-live="polite"
              className="absolute right-3 bottom-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white tabular-nums"
            >
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {many && (
        <ul
          ref={thumbsRef}
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          aria-label="Chọn ảnh"
        >
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={`block size-16 cursor-pointer overflow-hidden rounded-lg border-2 bg-white transition sm:size-20 ${
                  i === index
                    ? "border-gold-500"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  draggable={false}
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoomed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ảnh ${index + 1}/${count} — ${alt}`}
          onClick={() => {
            if (!swipe.consumeSwipe()) setZoomed(false);
          }}
          {...swipe.handlers}
          className="fixed inset-0 z-50 flex touch-pan-y items-center justify-center bg-black/90 p-4 select-none sm:p-10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[index]}
            alt={`${alt} — ảnh ${index + 1}/${count}`}
            draggable={false}
            // Phủ vừa khung xem (giữ tỉ lệ): ảnh nhỏ cũng được phóng to,
            // không lọt thỏm giữa màn hình đen. Bấm vào ảnh cũng là đóng.
            className="size-full object-contain"
          />

          <button
            type="button"
            onClick={() => setZoomed(false)}
            aria-label="Đóng"
            autoFocus
            className="absolute top-4 right-4 grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <CloseIcon className="size-6" />
          </button>

          {many && (
            <>
              <NavButton direction="prev" onClick={prev} large />
              <NavButton direction="next" onClick={next} large />
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white tabular-nums">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
