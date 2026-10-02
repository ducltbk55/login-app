"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { PermissionDef, PermissionGroup } from "@/lib/permission-groups";
import {
  BUTTON,
  CARD_SUBTLE,
  CHECKBOX,
  INPUT,
  LABEL_TEXT,
} from "@/lib/styles";

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
  permissionCatalogHref,
  action,
}: {
  /** Có `group` là sửa, không có là thêm mới. */
  group?: PermissionGroup;
  permissions: PermissionDef[];
  /** Trang chi tiết của danh mục quyền, để admin thêm quyền mới. */
  permissionCatalogHref: string;
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, null);
  const checked = new Set(group?.permissions ?? []);

  return (
    <form action={formAction} className="max-w-3xl space-y-5">
      <div className={`${CARD_SUBTLE} space-y-4`}>
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
      </div>

      <fieldset className={`${CARD_SUBTLE} space-y-5`}>
        <legend className="float-left mb-3 w-full text-sm font-semibold text-admin-text">
          Quyền của nhóm
        </legend>

        <p className="rounded-lg bg-brand-500/10 px-3 py-2 text-xs text-brand-700 dark:text-brand-300">
          Danh sách bên dưới lấy từ chi tiết của danh mục{" "}
          <Link
            href={permissionCatalogHref}
            className="font-semibold underline underline-offset-2"
          >
            Danh mục quyền
          </Link>
          . Muốn thêm quyền mới thì thêm một chi tiết ở đó; quyền bị tắt sẽ
          không hiện ở đây.
        </p>

        {permissions.length === 0 && (
          <p className="text-sm text-admin-muted">
            Danh mục quyền đang trống nên chưa có quyền nào để chọn.
          </p>
        )}

        {groupByArea(permissions).map(([area, items]) => (
          <div key={area} className="space-y-2">
            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase dark:text-brand-300">
              {area}
            </p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {items.map((permission) => (
                <li key={permission.key}>
                  {/* Vùng bấm rộng cả ô: dễ chạm trên mobile */}
                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent p-2 text-sm transition hover:border-admin-border hover:bg-brand-500/5">
                    <input
                      type="checkbox"
                      name="permissions"
                      value={permission.key}
                      defaultChecked={checked.has(permission.key)}
                      className={`${CHECKBOX} mt-0.5`}
                    />
                    <span className="min-w-0">
                      {permission.label}
                      {permission.description && (
                        <span className="mt-0.5 block text-xs text-admin-muted">
                          {permission.description}
                        </span>
                      )}
                      <code className="mt-0.5 block font-mono text-xs break-all text-admin-muted">
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
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
        <Link
          href="/admin/permission-groups"
          className={`${BUTTON.secondary} w-full sm:w-auto`}
        >
          Huỷ
        </Link>
        <SubmitButton className="w-full sm:w-auto">
          {group ? "Lưu thay đổi" : "Tạo nhóm"}
        </SubmitButton>
      </div>
    </form>
  );
}
