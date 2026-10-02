/** Class dùng lại cho các nút và bảng trong admin, tránh copy chuỗi Tailwind. */
const BUTTON_BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full " +
  "px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed " +
  "disabled:opacity-50 focus:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-blue-500";

export const BUTTON = {
  primary: `${BUTTON_BASE} bg-foreground text-background hover:opacity-90`,
  secondary: `${BUTTON_BASE} border border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10`,
  danger: `${BUTTON_BASE} border border-red-500/40 text-red-600 hover:bg-red-500/10 dark:text-red-400`,
} as const;

export const INPUT =
  "w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm " +
  "outline-none focus-visible:border-blue-500 focus-visible:ring-2 " +
  "focus-visible:ring-blue-500/30 dark:border-white/20";

export const LABEL = "block space-y-1.5 text-sm";
export const LABEL_TEXT = "font-medium opacity-70";

export const TABLE = {
  wrapper:
    "overflow-x-auto rounded-xl border border-black/10 dark:border-white/15",
  table: "w-full min-w-[40rem] border-collapse text-sm",
  th: "border-b border-black/10 px-4 py-3 text-left text-xs font-medium uppercase opacity-60 dark:border-white/15",
  td: "border-b border-black/5 px-4 py-3 align-middle dark:border-white/10",
  empty: "px-4 py-10 text-center text-sm opacity-60",
} as const;

export const CARD_SUBTLE =
  "rounded-xl border border-black/10 p-4 dark:border-white/15";
