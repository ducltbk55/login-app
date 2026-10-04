"use client";

import { useId, useRef, useSyncExternalStore, type ReactNode } from "react";

import { TABLIST, TabLabel, tabClass } from "@/components/site/tab-ui";

export type Tab = {
  /** Dùng làm #hash trên URL: link /san-pham/x#thong-so-ky-thuat mở thẳng tab. */
  id: string;
  label: string;
  icon?: ReactNode;
  /** Số hiện cạnh nhãn, vd. số dòng thông số. */
  badge?: number;
  content: ReactNode;
};

/**
 * `replaceState` không bắn `hashchange`, nên khi bấm tab tự báo bằng sự kiện
 * riêng. Hash là nguồn sự thật duy nhất: bấm tab, bấm link #…, nút back đều
 * đi qua cùng một đường.
 */
const TAB_HASH_EVENT = "tabs:hash";

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  window.addEventListener(TAB_HASH_EVENT, onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener(TAB_HASH_EVENT, onChange);
  };
}

/**
 * Tab theo mẫu WAI-ARIA: ←/→/Home/End để chuyển tab khi đang focus vào thanh
 * tab. Nội dung mọi tab đều render sẵn từ server (chỉ ẩn bằng `hidden`) nên
 * công cụ tìm kiếm vẫn đọc được cả phần đang ẩn.
 */
export function Tabs({
  tabs,
  defaultTab,
}: {
  tabs: Tab[];
  /** Tab mở sẵn; mặc định là tab đầu. */
  defaultTab?: string;
}) {
  // Tab đang mở = #hash trên URL nếu khớp một tab, không thì tab mặc định.
  // Server không có #hash → "" (khớp lúc hydrate); trình duyệt đọc thật.
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  const fromHash = tabs.some((tab) => tab.id === hash) ? hash : null;
  const active = fromHash ?? defaultTab ?? tabs[0]?.id;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  const select = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    // Ghi #hash để chia sẻ đúng tab, không cuộn trang, không thêm lịch sử.
    window.history.replaceState(window.history.state, "", `#${tab.id}`);
    window.dispatchEvent(new Event(TAB_HASH_EVENT));
    buttons.current[tabs.indexOf(tab)]?.focus();
  };

  const current = tabs.findIndex((tab) => tab.id === active);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Thông tin sản phẩm"
        className={TABLIST}
        onKeyDown={(event) => {
          const moves: Record<string, number> = {
            ArrowRight: current + 1,
            ArrowLeft: current - 1,
            Home: 0,
            End: tabs.length - 1,
          };
          if (event.key in moves) {
            event.preventDefault();
            select(moves[event.key]);
          }
        }}
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(element) => {
                buttons.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              // Chỉ tab đang chọn nhận Tab; chuyển giữa các tab bằng phím mũi tên.
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
              className={tabClass(selected)}
            >
              <TabLabel
                icon={tab.icon}
                label={tab.label}
                badge={tab.badge}
                selected={selected}
              />
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="mt-4 rounded-3xl border border-black/10 bg-white p-5 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-gold-400 sm:p-8"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
