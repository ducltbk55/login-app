import type { ReactNode } from "react";

/**
 * Kiểu dáng chung cho các cụm tab ở trang sản phẩm (Video/Hình ảnh, Mô tả/
 * Thông số): thanh nền vàng nhạt bo tròn, tab đang chọn nổi lên nền trắng.
 * Tách riêng để hai cụm luôn trông như một bộ.
 */
/*
 * `overflow-x-auto` để vuốt ngang khi tab dài trên điện thoại. Theo CSS, đặt
 * overflow một chiều thì chiều kia thành `auto` — bóng/viền của tab lấn 1px
 * là hiện thước dọc. Nên khoá hẳn chiều dọc và ẩn thanh cuộn.
 */
export const TABLIST =
  "flex w-full gap-1 overflow-x-auto sm:inline-flex sm:w-auto overflow-y-hidden rounded-2xl border border-gold-200/70 bg-gold-50/80 p-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function tabClass(selected: boolean): string {
  // Điện thoại: các tab chia đều bề ngang, chữ nhỏ hơn chút cho vừa một hàng.
  return `group inline-flex flex-1 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[0.8125rem] font-semibold sm:flex-none sm:gap-2 sm:px-4 sm:text-sm whitespace-nowrap transition outline-none focus-visible:ring-2 focus-visible:ring-gold-400 ${
    selected
      ? "bg-white text-ink-900 shadow-sm ring-1 ring-black/5"
      : "text-black/55 hover:bg-white/60 hover:text-black/80"
  }`;
}

/** Icon + nhãn + số đếm (vd. "Hình ảnh 4") bên trong một tab. */
export function TabLabel({
  icon,
  label,
  badge,
  selected,
}: {
  icon?: ReactNode;
  label: string;
  badge?: number;
  selected: boolean;
}) {
  return (
    <>
      {icon && (
        <span
          className={`grid size-5 place-items-center transition ${
            selected ? "text-gold-600" : "text-black/40 group-hover:text-black/60"
          }`}
          aria-hidden
        >
          {icon}
        </span>
      )}
      {label}
      {badge !== undefined && (
        <span
          // Ẩn trên điện thoại để hai tab vừa một hàng.
          className={`hidden min-w-5 rounded-full px-1.5 sm:inline-block py-0.5 text-center text-[0.6875rem] leading-none tabular-nums ${
            selected ? "bg-gold-100 text-gold-800" : "bg-black/5 text-black/50"
          }`}
        >
          {badge}
        </span>
      )}
    </>
  );
}
