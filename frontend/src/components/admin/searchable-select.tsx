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
}: {
  name: string;
  options: SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
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
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  const choose = (option: SelectOption) => {
    setValue(option.value);
    setOpen(false);
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
    <div ref={containerRef} className="relative" onKeyDown={onKeyDown}>
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
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={`${INPUT} flex cursor-pointer items-center gap-2 text-left ${
          open ? "border-brand-500 ring-2 ring-brand-500/25" : ""
        }`}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selected ? "" : "text-admin-muted"
          }`}
        >
          {selected ? selected.label : placeholder}
        </span>
        {selected?.hint && (
          <span className="shrink-0 font-mono text-xs text-admin-muted">
            {selected.hint}
          </span>
        )}
        <ChevronDownIcon
          className={`size-4 shrink-0 text-admin-muted transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-admin-border bg-admin-surface shadow-2xl">
          <div className="relative border-b border-admin-border">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-muted" />
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
                    index === activeIndex ? "bg-brand-500/10" : ""
                  } ${
                    option.value === value
                      ? "font-semibold text-brand-700 dark:text-brand-300"
                      : "text-admin-text"
                  }`}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {option.label}
                  </span>
                  {option.hint && (
                    <span className="shrink-0 font-mono text-xs text-admin-muted">
                      {option.hint}
                    </span>
                  )}
                </button>
              </li>
            ))}

            {visible.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-admin-muted">
                {options.length === 0 ? emptyLabel : "Không tìm thấy"}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
