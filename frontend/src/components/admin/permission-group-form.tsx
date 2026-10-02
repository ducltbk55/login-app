"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type {
  PermissionDef,
  PermissionGroup,
} from "@/lib/permission-groups";
import { BUTTON, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

/** Gom quyền theo nhóm để render thành từng khối cho dễ đọc. */
function groupByArea(permissions: PermissionDef[]) {
  const areas = new Map<string, PermissionDef[]>();
  for (const permission of permissions) {
    const list = areas.get(permission.group) ?? [];
    list.push(permission);
    areas.set(permission.group, list);
  }
  return [...areas];
}

export function PermissionGroupForm({
  group,
  permissions,
  action,
}: {
  /** Có `group` là sửa, không có là thêm mới. */
  group?: PermissionGroup;
  permissions: PermissionDef[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, null);
  const checked = new Set(group?.permissions ?? []);

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tên nhóm *</span>
        <input
          name="name"
          required
          maxLength={120}
          defaultValue={group?.name}
          placeholder="Ví dụ: Biên tập viên"
          className={INPUT}
        />
      </label>

      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Slug</span>
        <input
          name="slug"
          maxLength={140}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          defaultValue={group?.slug}
          placeholder="bỏ trống để tự sinh từ tên"
          className={INPUT}
        />
      </label>

      <label className="block text-sm">
        <span className={`mb-1.5 block ${LABEL_TEXT}`}>Mô tả</span>
        <textarea
          name="description"
          rows={2}
          maxLength={500}
          defaultValue={group?.description ?? ""}
          className={INPUT}
        />
      </label>

      <fieldset className="space-y-4 rounded-xl border border-black/10 p-4 dark:border-white/15">
        <legend className="px-1 text-sm font-medium opacity-70">
          Quyền của nhóm
        </legend>

        {groupByArea(permissions).map(([area, items]) => (
          <div key={area} className="space-y-2">
            <p className="text-xs font-medium uppercase opacity-60">{area}</p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {items.map((permission) => (
                <li key={permission.key}>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission.key}
                      defaultChecked={checked.has(permission.key)}
                      className="mt-1 size-4 accent-blue-600"
                    />
                    <span>
                      {permission.label}
                      <code className="mt-0.5 block text-xs opacity-50">
                        {permission.key}
                      </code>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </fieldset>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton>{group ? "Lưu thay đổi" : "Tạo nhóm"}</SubmitButton>
        <Link href="/admin/permission-groups" className={BUTTON.secondary}>
          Huỷ
        </Link>
      </div>
    </form>
  );
}
