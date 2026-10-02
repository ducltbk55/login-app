import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { UserStatusBadge } from "@/components/admin/user-status-badge";
import { Badge } from "@/components/badge";
import { BackendError } from "@/lib/backend";
import {
  DEV_LOGIN_ENABLED,
  isLocalRequest,
  listDevLoginUsers,
} from "@/lib/dev-login";

export const metadata = { title: "Dev login" };

/** Luôn đọc lại danh sách: tài khoản thay đổi liên tục lúc phát triển. */
export const dynamic = "force-dynamic";

export default async function DevLoginPage() {
  const requestHeaders = await headers();
  // `isLocalRequest` nhận Request nên dựng tạm một cái chỉ để mang header host.
  const local = isLocalRequest(new Request("http://x", { headers: requestHeaders }));
  if (!DEV_LOGIN_ENABLED || !local) notFound();

  // Backend có cờ riêng; chưa bật thì nói rõ cách bật thay vì ném 500.
  let users;
  try {
    users = await listDevLoginUsers();
  } catch (error) {
    if (!(error instanceof BackendError)) throw error;
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12">
        <Badge tone="danger">Backend đang chặn</Badge>
        <h1 className="mt-3 text-2xl font-bold text-ink-900">
          Chưa bật đăng nhập theo id
        </h1>
        <p className="mt-2 text-sm text-black/60">{error.message}</p>
        <p className="mt-4 text-sm text-black/60">
          Sửa xong nhớ khởi động lại NestJS — file env chỉ đọc lúc bật.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-8">
        <Badge tone="danger">Chỉ môi trường dev</Badge>
        <h1 className="mt-3 text-2xl font-bold text-ink-900">
          Đăng nhập nhanh bằng id
        </h1>
        <p className="mt-2 text-sm text-black/60">
          Bấm một tài khoản để tạo phiên ngay, không qua Google. Hoặc dán thẳng{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">
            /dev-login/&lt;id&gt;
          </code>{" "}
          vào thanh địa chỉ. Thêm{" "}
          <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">
            ?next=/admin
          </code>{" "}
          để chọn nơi đáp.
        </p>
      </header>

      {users.length === 0 ? (
        <p className="rounded-lg border border-black/10 bg-black/[0.02] px-4 py-6 text-center text-sm text-black/55">
          Chưa có người dùng nào trong cơ sở dữ liệu.
        </p>
      ) : (
        <ul className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/10">
          {users.map((user) => (
            <li key={user.id}>
              <Link
                href={`/dev-login/${user.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 transition hover:bg-brand-50"
              >
                <span className="w-10 shrink-0 font-mono text-sm font-semibold text-brand-700">
                  #{user.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink-900">
                    {user.name ?? "(chưa có tên)"}
                  </span>
                  <span className="block truncate text-xs text-black/50">
                    {user.email}
                  </span>
                </span>
                {user.role === "admin" && <Badge tone="brand">Quản trị</Badge>}
                <UserStatusBadge status={user.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-black/45">
        Trạng thái chờ duyệt hoặc bị khoá vẫn đăng nhập được ở đây — cố ý như
        vậy để thử giao diện của những tài khoản đó. Lần đăng nhập này không ghi
        vào lịch sử và không tăng số lần đăng nhập.
      </p>
    </main>
  );
}
