"use client";

import { useId, useRef, useState } from "react";

import { CloseIcon } from "@/components/admin/icons";
import {
  MAX_SPEC_LABEL,
  MAX_SPEC_VALUE,
  MAX_SPECS,
  type ProductSpec,
} from "@/lib/products";
import { BUTTON, BUTTON_SM, INPUT } from "@/lib/styles";

type Row = ProductSpec & { key: number };

/**
 * "Camera: 200MP" / "Camera<TAB>200MP" (dán từ Excel) → dòng thông số.
 * Dòng không có dấu phân cách thì bỏ qua.
 */
function parsePasted(text: string): ProductSpec[] {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^\s*([^:\t]+?)\s*[:\t]\s*(.+?)\s*$/);
      return match ? { label: match[1], value: match[2] } : null;
    })
    .filter((spec): spec is ProductSpec => spec !== null);
}

const keyOf = (label: string) => label.trim().toLocaleLowerCase("vi");

/**
 * Bảng thông số kỹ thuật động: mỗi sản phẩm tự đặt tên trường của mình.
 * Gửi lên server qua input ẩn dạng JSON `[{label, value}]`; dòng bỏ trống cả
 * hai ô thì không gửi.
 */
export function SpecsField({
  name,
  defaultValue = [],
  suggestions = [],
}: {
  name: string;
  defaultValue?: ProductSpec[];
  /** Tên thông số đã dùng ở sản phẩm khác — gợi ý khi gõ cho thống nhất. */
  suggestions?: string[];
}) {
  const nextKey = useRef(defaultValue.length);
  const [rows, setRows] = useState<Row[]>(() =>
    defaultValue.map((spec, index) => ({ ...spec, key: index })),
  );
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const listId = useId();

  const newRow = (spec: ProductSpec = { label: "", value: "" }): Row => ({
    ...spec,
    key: nextKey.current++,
  });

  const filled = rows.filter((row) => row.label.trim() || row.value.trim());
  const counts = new Map<string, number>();
  for (const row of filled) {
    const key = keyOf(row.label);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const isDuplicate = (row: Row) => (counts.get(keyOf(row.label)) ?? 0) > 1;
  const hasDuplicate = filled.some(isDuplicate);
  const full = rows.length >= MAX_SPECS;

  const update = (key: number, patch: Partial<ProductSpec>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  const move = (from: number, to: number) =>
    setRows((current) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  function importPasted() {
    const specs = parsePasted(pasted);
    if (specs.length === 0) return;
    setRows((current) => {
      // Bỏ các dòng trống sẵn có để dữ liệu dán vào nằm liền nhau.
      const kept = current.filter(
        (row) => row.label.trim() || row.value.trim(),
      );
      return [...kept, ...specs.map((spec) => newRow(spec))].slice(
        0,
        MAX_SPECS,
      );
    });
    setPasted("");
    setPasting(false);
  }

  return (
    <div className="space-y-3 text-sm">
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(
          filled.map(({ label, value }) => ({
            label: label.trim(),
            value: value.trim(),
          })),
        )}
      />
      <datalist id={listId}>
        {suggestions.map((label) => (
          <option key={label} value={label} />
        ))}
      </datalist>

      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row, index) => {
            const duplicate = isDuplicate(row);
            return (
              <li key={row.key} className="flex items-start gap-2">
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`Đưa dòng ${index + 1} lên`}
                    className="h-4.5 cursor-pointer px-1 text-[0.625rem] leading-none text-admin-muted hover:text-admin-text disabled:invisible"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, index + 1)}
                    disabled={index === rows.length - 1}
                    aria-label={`Đưa dòng ${index + 1} xuống`}
                    className="h-4.5 cursor-pointer px-1 text-[0.625rem] leading-none text-admin-muted hover:text-admin-text disabled:invisible"
                  >
                    ▼
                  </button>
                </div>
                {/* Lưới 2:3 thay vì đặt width từng ô: INPUT dùng chung có sẵn w-full. */}
                <div className="grid min-w-0 flex-1 grid-cols-[2fr_3fr] items-start gap-2">
                  <input
                    value={row.label}
                    onChange={(event) =>
                      update(row.key, { label: event.target.value })
                    }
                    list={listId}
                    maxLength={MAX_SPEC_LABEL}
                    placeholder="Tên, vd. Camera"
                    aria-label={`Tên thông số dòng ${index + 1}`}
                    aria-invalid={duplicate || undefined}
                    className={`${INPUT} font-medium ${
                      duplicate ? "border-red-500 focus:border-red-500" : ""
                    }`}
                  />
                  {/* Textarea tự giãn: giá trị được phép nhiều dòng ("5000mAh"
                      xuống dòng "Sạc nhanh 45W"), input một dòng sẽ nuốt mất
                      dấu xuống dòng khi lưu lại. */}
                  <textarea
                    value={row.value}
                    onChange={(event) =>
                      update(row.key, { value: event.target.value })
                    }
                    rows={1}
                    maxLength={MAX_SPEC_VALUE}
                    placeholder="Giá trị, vd. 200MP"
                    aria-label={`Giá trị thông số dòng ${index + 1}`}
                    className={`${INPUT} field-sizing-content min-h-[2.375rem] resize-none`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setRows((current) =>
                      current.filter((item) => item.key !== row.key),
                    )
                  }
                  aria-label={`Xoá dòng ${index + 1}`}
                  title="Xoá dòng"
                  className="mt-1.5 grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-admin-muted transition hover:bg-red-500/10 hover:text-red-600"
                >
                  <CloseIcon className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setRows((current) => [...current, newRow()])}
          disabled={full}
          className={`${BUTTON.secondary} ${BUTTON_SM}`}
        >
          + Thêm dòng
        </button>
        <button
          type="button"
          onClick={() => setPasting((open) => !open)}
          disabled={full}
          aria-expanded={pasting}
          className={`${BUTTON.ghost} ${BUTTON_SM}`}
        >
          Dán nhanh nhiều dòng
        </button>
      </div>

      {pasting && (
        <div className="space-y-2 rounded-lg border border-admin-border bg-admin-surface-2 p-3">
          <textarea
            value={pasted}
            onChange={(event) => setPasted(event.target.value)}
            rows={5}
            placeholder={
              "Mỗi dòng một thông số, ngăn bằng dấu hai chấm hoặc Tab:\nCamera: 200MP\nMàn hình: 6.7 inch, 144Hz\nPin: 5000mAh"
            }
            className={`${INPUT} resize-y font-mono text-xs`}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={importPasted}
              disabled={parsePasted(pasted).length === 0}
              className={`${BUTTON.primary} ${BUTTON_SM}`}
            >
              Thêm {parsePasted(pasted).length || ""} dòng
            </button>
            <button
              type="button"
              onClick={() => setPasting(false)}
              className={`${BUTTON.secondary} ${BUTTON_SM}`}
            >
              Thôi
            </button>
          </div>
        </div>
      )}

      {hasDuplicate ? (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          Có tên thông số bị trùng (ô viền đỏ) — hãy gộp lại hoặc đổi tên.
        </p>
      ) : (
        <p className="text-xs text-admin-muted">
          {filled.length}/{MAX_SPECS} dòng. Có thông số thì trang chi tiết hiện
          thêm tab “Thông số kỹ thuật”.
        </p>
      )}
    </div>
  );
}
