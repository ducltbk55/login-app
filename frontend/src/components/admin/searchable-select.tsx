"use client";

import { useEffect, useId, useRef, useState } from "react";

import { ChevronDownIcon, SearchIcon } from "@/components/admin/icons";
import { matchesSearch } from "@/lib/search";
import { INPUT } from "@/lib/styles";

export type SelectOption = {
  value: string;
  label: string;
  /** Chữ phụ bên phải, ví dụ mã của danh mục. */
  hint?: string;
};

/**
 * Hai bộ màu: `admin` theo token của khu quản trị (đổi theo dark mode),
 * `site` cho trang ngoài — nền trắng cố định, điểm nhấn vàng kim.
 */
const VARIANTS = {
  admin: {
    trigger: INPUT,
    open: "border-brand-500 ring-2 ring-brand-500/25",
    muted: "text-admin-muted",
    panel: "border-admin-border bg-admin-surface",
    divider: "border-admin-border",
    active: "bg-brand-500/10",
    selected: "font-semibold text-brand-700 dark:text-brand-300",
    option: "text-admin-text",
  },
  site: {
    trigger:
      "w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm " +
      "text-ink-900 outline-none transition focus-visible:border-gold-500 " +
      "focus-visible:ring-2 focus-visible:ring-gold-400/30",
    open: "border-gold-500 ring-2 ring-gold-400/30",
    muted: "text-black/40",
    panel: "border-black/10 bg-white text-ink-900",
    divider: "border-black/10",
    active: "bg-gold-50",
    selected: "font-semibold text-gold-800",
    option: "text-black/80",
  },
} as const;

/**
 * Ô chọn có tìm kiếm, thay cho `<select>` gốc.
 *
 * Giá trị nằm ở một `<input>` ẩn mang đúng `name`, nên dùng được cả trong form
 * GET của bộ lọc lẫn form gọi server action mà không cần sửa gì ở phía nhận.
 * Input đó là `sr-only` chứ không phải `hidden`: trình duyệt chỉ chạy kiểm tra
 * `required` trên trường còn hiển thị được.
 */
export function SearchableSelect({
  name,
  options,
  defaultValue = "",
  placeholder = "— Chọn —",
  required = false,
  searchPlaceholder = "Gõ để tìm…",
  emptyLabel = "Không có lựa chọn nào",
  disabled = false,
  onChange,
  value: controlled,
  variant = "admin",
  className = "",
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  /** Dùng khi một ô chọn khác phải nạp lại theo giá trị này (tỉnh → phường). */
  onChange?: (value: string) => void;
  /**
   * Truyền vào thì thành ô điều khiển: giá trị do component cha giữ (bộ lọc
   * áp dụng ngay khi đổi). Không truyền thì tự giữ, khởi đầu từ `defaultValue`.
   */
  value?: string;
  variant?: keyof typeof VARIANTS;
  /** Class cho khung ngoài, ví dụ độ rộng cố định của ô sắp xếp. */
  className?: string;
}) {
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const setValue = setInner;
  const theme = VARIANTS[variant];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);
  const visible = query
    ? options.filter((option) =>
        matchesSearch(query, option.label, option.hint ?? ""),
      )
    : options;

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const openMenu = () => {
    setQuery("");
    setActiveIndex(
      Math.max(
        0,
        options.findIndex((o) => o.value === value),
      ),
    );
    setOpen(true);
  };

  const choose = (option: SelectOption) => {
    setValue(option.value);
    setOpen(false);
    onChange?.(option.value);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openMenu();
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => {
        if (visible.length === 0) return 0;
        return (current + step + visible.length) % visible.length;
      });
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      const option = visible[activeIndex];
      if (option) choose(option);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      onKeyDown={onKeyDown}
    >
      {/*
        Trường thật của form: giữ giá trị và gánh luôn kiểm tra `required`.
        Cố ý KHÔNG đặt `aria-hidden`: khi validate hỏng trình duyệt sẽ focus vào
        đây, mà focus một phần tử aria-hidden là sai. `tabIndex={-1}` đã đủ để
        nó không nằm trong luồng Tab — người dùng thao tác qua nút combobox.
      */}
      <input
        name={name}
        required={required}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        tabIndex={-1}
        className="sr-only"
      />

      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`${theme.trigger} flex items-center gap-2 text-left ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        } ${open ? theme.open : ""}`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selected ? "" : theme.muted
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        {selected?.hint && (
          <span className={`shrink-0 font-mono text-xs ${theme.muted}`}>
            {selected.hint}
          </span>
        )}
        <ChevronDownIcon
          className={`size-4 shrink-0 transition ${theme.muted} ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-1 w-full min-w-48 overflow-hidden rounded-lg border shadow-2xl ${theme.panel}`}
        >
          <div className={`relative border-b ${theme.divider}`}>
            <SearchIcon
              className={`pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 ${theme.muted}`}
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent py-2 pr-3 pl-9 text-sm outline-none"
            />
          </div>

          <ul
            id={listboxId}
            role="listbox"
            className="admin-scroll max-h-64 overflow-y-auto p-1"
          >
            {visible.map((option, index) => (
              <li key={option.value || "__empty"}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(option)}
                  className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                    index === activeIndex ? theme.active : ""
                  } ${option.value === value ? theme.selected : theme.option}`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {option.hint && (
                    <span
                      className={`shrink-0 font-mono text-xs ${theme.muted}`}
                    >
                      {option.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}

            {visible.length === 0 && (
              <li className={`px-3 py-6 text-center text-sm ${theme.muted}`}>
                {options.length === 0 ? emptyLabel : "Không tìm thấy"}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
