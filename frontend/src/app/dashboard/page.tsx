import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Avatar } from "@/components/avatar";
import { Card } from "@/components/card";
import { SignOutButton } from "@/components/sign-out-button";
import { formatDateTime } from "@/lib/format";
import { findUserByEmail, getLoginHistory } from "@/lib/users";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const email = session.user.email;
  // Đọc trực tiếp từ backend NestJS để chứng minh dữ liệu đã được lưu.
  const [record, history] = await Promise.all([
    findUserByEmail(email),
    getLoginHistory(email, 5),
  ]);

  const name = record?.name ?? session.user.name;
  const image = record?.image ?? session.user.image;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Card className="space-y-8">
        <header className="flex items-center gap-4">
          {image && <Avatar src={image} name={name} />}
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">{name ?? "Người dùng"}</h1>
            <p className="text-sm opacity-70">{email}</p>
            {session.user.isNewUser && (
              <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Tài khoản vừa được đăng ký 🎉
              </span>
            )}
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-medium opacity-70">
            Bản ghi trong database (NestJS + SQLite)
          </h2>
          <dl className="grid gap-px overflow-hidden rounded-xl border border-black/10 bg-black/10 text-sm sm:grid-cols-2 dark:border-white/15 dark:bg-white/15">
            <Field
              label="Mã người dùng"
              value={record?.id ?? session.user.id}
              mono
            />
            <Field label="Nhà cung cấp" value={record?.provider ?? "google"} />
            <Field
              label="Ngày đăng ký"
              value={formatDateTime(record?.createdAt)}
            />
            <Field
              label="Lần đăng nhập gần nhất"
              value={formatDateTime(record?.lastLoginAt)}
            />
            <Field
              label="Số lần đăng nhập"
              value={String(record?.loginCount ?? 1)}
            />
            <Field
              label="Trạng thái"
              value={record ? "Đã lưu ở backend" : "Chưa đồng bộ"}
            />
          </dl>
        </section>

        {history.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium opacity-70">
              {history.length} lần đăng nhập gần nhất
            </h2>
            <ul className="divide-y divide-black/10 rounded-xl border border-black/10 text-sm dark:divide-white/10 dark:border-white/15">
              {history.map((event) => (
                <li
                  key={event.id}
                  className="flex justify-between gap-4 px-4 py-3"
                >
                  <span>{formatDateTime(event.occurredAt)}</span>
                  <span className="opacity-60">{event.provider}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100"
          >
            Về trang chủ
          </Link>
          <SignOutButton />
        </div>
      </Card>
    </main>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-background p-4">
      <dt className="text-xs uppercase opacity-60">{label}</dt>
      <dd className={`mt-1 break-all ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
