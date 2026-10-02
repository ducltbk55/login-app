"use client";

import { useActionState } from "react";

import { SearchableSelect } from "@/components/admin/searchable-select";
import { SubmitButton } from "@/components/submit-button";
import type { PermissionGroup } from "@/lib/permission-groups";
import { CHECKBOX, LABEL_TEXT } from "@/lib/styles";
import type { StoredUserDetail } from "@/lib/users";

type ActionState = { error?: string; success?: string } | null;
type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function Notice({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;

  return (
    <p
      role="status"
      className={`rounded-lg border px-3 py-2 text-sm ${
        state.error
          ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      }`}
    >
      {state.error ?? state.success}
    </p>
  );
}

export function RoleStatusForm({
  user,
  action,
}: {
  user: StoredUserDetail;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="email" value={user.email} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="text-sm">
          <span className={`mb-1.5 block ${LABEL_TEXT}`}>Vai trò</span>
          <SearchableSelect
            name="role"
            defaultValue={user.role}
            options={[
              { value: "user", label: "user" },
              { value: "admin", label: "admin" },
            ]}
          />
        </div>
        <div className="text-sm">
          <span className={`mb-1.5 block ${LABEL_TEXT}`}>Trạng thái</span>
          <SearchableSelect
            name="status"
            defaultValue={user.status}
            options={[
              { value: "active", label: "active" },
              { value: "blocked", label: "blocked" },
            ]}
          />
        </div>
      </div>

      <p className="rounded-lg bg-admin-surface-2 px-3 py-2 text-xs text-admin-muted">
        Khoá tài khoản chặn được lần đăng nhập kế tiếp; phiên hiện tại của họ vẫn
        còn hiệu lực tới khi hết hạn.
      </p>

      <Notice state={state} />
      <SubmitButton className="w-full sm:w-auto">Lưu thay đổi</SubmitButton>
    </form>
  );
}

export function UserGroupsForm({
  user,
  groups,
  action,
}: {
  user: StoredUserDetail;
  groups: PermissionGroup[];
  action: Action;
}) {
  const [state, formAction] = useActionState(action, null);
  const assigned = new Set(user.groups.map((g) => g.id));

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="email" value={user.email} />

      {groups.length === 0 ? (
        <p className="text-sm text-admin-muted">
          Chưa có nhóm quyền nào — hãy tạo ở mục Nhóm quyền.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {groups.map((group) => (
            <li key={group.id}>
              {/* Vùng bấm rộng cả ô: dễ chạm trên mobile */}
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2.5 text-sm transition hover:border-admin-border hover:bg-brand-500/5">
                <input
                  type="checkbox"
                  name="groupIds"
                  value={group.id}
                  defaultChecked={assigned.has(group.id)}
                  className={`${CHECKBOX} mt-0.5`}
                />
                <span className="min-w-0">
                  <span className="block font-medium">{group.name}</span>
                  <span className="block text-xs text-admin-muted">
                    {group.permissions.length} quyền · {group.slug}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <Notice state={state} />
      <SubmitButton className="w-full sm:w-auto">Lưu nhóm quyền</SubmitButton>
    </form>
  );
}
