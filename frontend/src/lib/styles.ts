/** Class dùng lại cho các nút, ô nhập và bảng trong admin, tránh copy chuỗi Tailwind. */
const BUTTON_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg " +
  "px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed " +
  "disabled:opacity-50 focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-brand-500/50 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-admin-bg";

export const BUTTON = {
  primary: `${BUTTON_BASE} bg-brand-600 text-white shadow-sm shadow-brand-600/25 hover:bg-brand-700 active:bg-brand-800`,
  secondary: `${BUTTON_BASE} border border-admin-border bg-admin-surface text-admin-text hover:border-brand-300 hover:bg-brand-50 dark:hover:bg-brand-500/10`,
  ghost: `${BUTTON_BASE} text-brand-700 hover:bg-brand-500/10 dark:text-brand-300`,
  danger: `${BUTTON_BASE} border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400`,
  /** Đặc, dùng cho nút xác nhận trong hộp thoại xoá. */
  dangerSolid: `${BUTTON_BASE} bg-red-600 text-white shadow-sm shadow-red-600/25 hover:bg-red-700 focus-visible:ring-red-500/50`,
} as const;

/** Nút nhỏ dùng trong ô thao tác của bảng. */
export const BUTTON_SM = "px-2.5 py-1 text-xs";

export const INPUT =
  "w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 " +
  "text-sm text-admin-text placeholder:text-admin-muted/70 outline-none " +
  "transition focus-visible:border-brand-500 focus-visible:ring-2 " +
  "focus-visible:ring-brand-500/25";

export const CHECKBOX = "size-4 shrink-0 rounded accent-brand-600";

export const LABEL = "block space-y-1.5 text-sm";
export const LABEL_TEXT = "font-medium text-admin-muted";

/** Khối thẻ chuẩn: nền sáng, viền mảnh, bo góc, đổ bóng nhẹ. */
export const CARD =
  "rounded-xl border border-admin-border bg-admin-surface shadow-admin";

export const CARD_SUBTLE = `${CARD} p-4 sm:p-5`;

export const TABLE = {
  wrapper: `${CARD} admin-scroll overflow-x-auto`,
  table: "w-full min-w-[44rem] border-collapse text-sm",
  thead: "bg-admin-surface-2",
  th:
    "border-b border-admin-border px-4 py-3 text-left text-xs font-semibold " +
    "uppercase tracking-wide text-admin-muted",
  tr: "transition hover:bg-brand-500/5",
  td: "border-b border-admin-border/60 px-4 py-3 align-middle",
  empty: "px-4 py-12 text-center text-sm text-admin-muted",
} as const;

/** Thẻ thay cho một hàng bảng khi màn hình hẹp (dưới `md`). */
export const ROW_CARD = `${CARD} space-y-3 p-4`;

export const LINK =
  "font-medium text-brand-700 underline-offset-4 transition hover:underline dark:text-brand-300";

export const CODE_CHIP =
  "rounded-md bg-brand-500/10 px-1.5 py-0.5 font-mono text-xs text-brand-700 dark:text-brand-300";

/** Nút vuông chỉ có icon, dùng cho cột thao tác của bảng. */
export const ICON_BUTTON =
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg border " +
  "border-admin-border bg-admin-surface text-admin-muted transition " +
  "hover:border-brand-300 hover:bg-brand-500/10 hover:text-brand-700 " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 " +
  "dark:hover:text-brand-300";
