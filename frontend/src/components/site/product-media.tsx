"use client";

import { useId, useState, type ReactNode } from "react";

import { ImagesIcon, PlayCircleIcon } from "@/components/admin/icons";
import { TABLIST, TabLabel, tabClass } from "@/components/site/tab-ui";
import { VideoPlayer } from "@/components/site/video-player";
import type { ParsedVideo } from "@/lib/video";

type MediaTab = "video" | "images";

const LABELS: Record<MediaTab, string> = {
  video: "Video",
  images: "Hình ảnh",
};

const ICONS: Record<MediaTab, ReactNode> = {
  video: <PlayCircleIcon className="size-5" />,
  images: <ImagesIcon className="size-5" />,
};

/**
 * Khu ảnh/video ở trang chi tiết: hai tab "Video" và "Hình ảnh".
 *
 * Không dùng chung <Tabs> của phần mô tả: tab đó ghi #hash lên URL, hai bộ
 * tab cùng ghi thì giẫm lên nhau. Ở đây trạng thái chỉ nằm trong component.
 *
 * Tab video chỉ được dựng khi đang mở — chuyển sang ảnh là gỡ player, video
 * dừng hẳn chứ không phát tiếng ngầm. Tab ảnh thì luôn giữ (chỉ ẩn) để
 * slideshow nhớ đang ở ảnh nào.
 */
export function ProductMedia({
  video,
  title,
  images,
  imageCount,
}: {
  video: ParsedVideo;
  title: string;
  /** Slideshow hoặc ảnh đại diện, server dựng sẵn. */
  images: ReactNode;
  /** Số ảnh, hiện cạnh nhãn tab "Hình ảnh". */
  imageCount?: number;
}) {
  const [active, setActive] = useState<MediaTab>("video");
  const baseId = useId();
  const tabs: MediaTab[] = ["video", "images"];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Video và hình ảnh sản phẩm"
        className={`${TABLIST} mb-3`}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
            event.preventDefault();
            const next = active === "video" ? "images" : "video";
            setActive(next);
            document.getElementById(`${baseId}-tab-${next}`)?.focus();
          }
        }}
      >
        {tabs.map((tab) => {
          const selected = tab === active;
          return (
            <button
              key={tab}
              id={`${baseId}-tab-${tab}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab)}
              className={tabClass(selected)}
            >
              <TabLabel
                icon={ICONS[tab]}
                label={LABELS[tab]}
                badge={tab === "images" && imageCount ? imageCount : undefined}
                selected={selected}
              />
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-video`}
        aria-labelledby={`${baseId}-tab-video`}
        hidden={active !== "video"}
      >
        {active === "video" && (
          <div className="overflow-hidden rounded-3xl border border-black/10 bg-black shadow-sm">
            <VideoPlayer video={video} title={title} className="rounded-none" />
          </div>
        )}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-images`}
        aria-labelledby={`${baseId}-tab-images`}
        hidden={active !== "images"}
      >
        {images}
      </div>
    </div>
  );
}
