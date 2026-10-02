"use client";

import { useState } from "react";

import { SearchableSelect } from "@/components/admin/searchable-select";
import { CHECKBOX, LABEL_TEXT } from "@/lib/styles";

export type GroupOption = { id: number; code: string; name: string };

/** Đưa danh mục/chi tiết về dạng mà ô chọn có tìm kiếm cần. */
export function toSelectOptions(options: GroupOption[]) {
  return options.map((option) => ({
    value: String(option.id),
    label: option.name,
    hint: option.code,
  }));
}

/**
 * Ô "Có Group" của danh mục: tích vào thì bắt buộc chọn một danh mục khác làm
 * nhóm cho các chi tiết. Bỏ tích thì gửi `groupCategoryId` rỗng = bỏ phân nhóm.
 *
 * Là client component vì ô chọn phải ẩn/hiện theo checkbox.
 */
export function GroupCategoryField({
  options,
  defaultValue,
}: {
  /** Các danh mục có thể làm nhóm (đã loại chính nó và danh mục gây vòng lặp). */
  options: GroupOption[];
  defaultValue: number | null;
}) {
  const [enabled, setEnabled] = useState(defaultValue !== null);

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          className={`${CHECKBOX} mt-0.5`}
        />
        <span>
          <span className="block font-medium">Có Group</span>
          <span className="block text-xs text-admin-muted">
            Chi tiết của danh mục này sẽ được phân nhóm theo chi tiết của một
            danh mục khác.
          </span>
        </span>
      </label>

      {enabled && (
        <div className="block text-sm">
          <span className={`mb-1.5 block ${LABEL_TEXT}`}>Danh mục nhóm *</span>
          <SearchableSelect
            name="groupCategoryId"
            required
            options={toSelectOptions(options)}
            defaultValue={defaultValue === null ? "" : String(defaultValue)}
            placeholder="— Chọn danh mục —"
            searchPlaceholder="Tìm theo tên hoặc mã…"
            emptyLabel="Chưa có danh mục nào dùng làm nhóm được"
          />
        </div>
      )}

      {/* Bỏ tích vẫn phải gửi trường rỗng, nếu không server hiểu là "giữ nguyên". */}
      {!enabled && <input type="hidden" name="groupCategoryId" value="" />}
    </div>
  );
}
