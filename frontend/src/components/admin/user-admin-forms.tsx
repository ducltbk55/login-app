"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/submit-button";
import type { PermissionGroup } from "@/lib/permission-groups";
import { INPUT, LABEL_TEXT } from "@/lib/styles";
import type { StoredUserDetail } from "@/lib/users";

type ActionState = { error?: string; success?: string } | null;
type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function Notice({ state }: { state: ActionState }) {
  if (!state?.error && !state?.success) return null;

  return (
    <p
      role="status"
      className={`rounded-lg px-3 py-2 text-sm ${
        state.error
          ? "bg-red-500/10 text-red-600 dark:text-red-400"
          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
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

      <div className="flex flex-wrap gap-3">
        <label className="text-sm">
          <span className={`mb-1.5 block ${LABEL_TEXT}`}>Vai trò</span>
          <select name="role" defaultValue={user.role} className={INPUT}>
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label className="text-sm">
          <span className={`mb-1.5 block ${LABEL_TEXT}`}>Trạng thái</span>
          <select name="status" defaultValue={user.status} className={INPUT}>
            <option value="active">active</option>
            <option value="blocked">blocked</option>
          </select>
        </label>
      </div>

      <p className="text-xs opacity-60">
        Khoá tài khoản chặn được lần đăng nhập kế tiếp; phiên hiện tại của họ vẫn
        còn hiệu lực tới khi hết hạn.
      </p>

      <Notice state={state} />
      <SubmitButton>Lưu thay đổi</SubmitButton>
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
        <p className="text-sm opacity-60">
          Chưa có nhóm quyền nào — hãy tạo ở mục Nhóm quyền.
        </p>
      ) : (
        <ul className="space-y-2">
          {groups.map((group) => (
            <li key={group.id}>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="groupIds"
                  value={group.id}
                  defaultChecked={assigned.has(group.id)}
                  className="mt-1 size-4 accent-blue-600"
                />
                <span>
                  <span className="font-medium">{group.name}</span>
                  <span className="block text-xs opacity-60">
                    {group.permissions.length} quyền · {group.slug}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <Notice state={state} />
      <SubmitButton>Lưu nhóm quyền</SubmitButton>
    </form>
  );
}
