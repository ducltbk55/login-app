import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Avatar } from "@/components/avatar";
import { MyOrders } from "@/components/site/my-orders";
import { canEnterAdmin } from "@/lib/access";
import { COMPANY_NAME } from "@/lib/company";
import { formatDate, formatDateTime } from "@/lib/format";
import { listOrders } from "@/lib/orders";
import {
  findUserByEmail,
  getLoginHistory,
  listProvinces,
  listWards,
  GENDER_LABELS,
} from "@/lib/users";

export const metadata = {
  title: "Trang cá nhân",
  description: `Thông tin tài khoản thành viên ${COMPANY_NAME}.`,
};

/** Một ô thông tin trong lưới. */
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
    <div>
      <dt className="text-xs font-semibold tracking-wider text-gold-700 uppercase">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-ink-900 ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function ProfilePage(props: PageProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { denied } = await props.searchParams;
  const email = session.user.email;
  const [record, history, orders] = await Promise.all([
    findUserByEmail(email),
    getLoginHistory(email, 5),
    // Lỗi đọc đơn hàng không được làm hỏng cả trang cá nhân.
    listOrders({ userEmail: email, pageSize: 20 })
      .then((result) => result.items)
      .catch(() => null),
  ]);

  // Cổng chặn: chưa khai đủ hồ sơ thì phải hoàn tất trước khi vào trang cá nhân.
  if (record && !record.profileCompleted) redirect("/ho-so");

  // Mã tỉnh/phường lưu trong DB, đổi sang tên để hiển thị.
  const [provinces, wards] = await Promise.all([
    record?.provinceCode ? listProvinces() : Promise.resolve([]),
    record?.provinceCode ? listWards(record.provinceCode) : Promise.resolve([]),
  ]);
  const fullAddress = [
    record?.addressLine,
    wards.find((w) => w.code === record?.wardCode)?.name,
    provinces.find((p) => p.code === record?.provinceCode)?.name,
  ]
    .filter(Boolean)
    .join(", ");

  const name = record?.name ?? session.user.name;
  const image = record?.image ?? session.user.image;
  const isAdmin = record?.role === "admin";
  // Link quản trị cho cả người được gán nhóm quyền, không riêng role admin.
  const showAdminLink = record ? canEnterAdmin(record) : false;

  return (
    <>
      {/* Banner tối, cùng nhịp với trang hồ sơ */}
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Thành viên
          </p>

          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="shrink-0 overflow-hidden rounded-full ring-2 ring-gold-400/40">
              {image ? (
                <Avatar src={image} name={name} size={72} />
              ) : (
                <span className="grid size-[72px] place-items-center bg-gold-400 text-2xl font-semibold text-ink-900">
                  {(name ?? email).charAt(0).toUpperCase()}
                </span>
              )}
            </span>

            <div className="min-w-0 space-y-2">
              <h1 className="truncate text-3xl font-semibold tracking-tight">
                {name ?? "Thành viên"}
              </h1>
              <p className="truncate text-white/70">{email}</p>
              <div className="flex flex-wrap gap-2">
                {isAdmin && (
                  <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-xs font-medium text-gold-200 ring-1 ring-gold-400/40">
                    Quản trị viên
                  </span>
                )}
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                    record?.status === "blocked"
                      ? "bg-red-400/20 text-red-100 ring-red-300/40"
                      : "bg-emerald-400/20 text-emerald-100 ring-emerald-300/40"
                  }`}
                >
                  {record?.status === "blocked" ? "Đã khoá" : "Đang hoạt động"}
                </span>
                {session.user.isNewUser && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium ring-1 ring-white/20">
                    Tài khoản vừa đăng ký 🎉
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:ml-auto">
              <Link
                href="/ho-so"
                className="inline-flex items-center justify-center rounded-lg bg-gold-400 px-5 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-gold-300"
              >
                Chỉnh sửa hồ sơ
              </Link>
              {showAdminLink && (
                <Link
                  href="/admin"
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/10"
                >
                  Trang quản trị
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-4xl space-y-6 px-4 py-12 sm:px-6 lg:px-8">
        {denied === "admin" && (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Bạn không có quyền truy cập trang quản trị.
          </p>
        )}

        <Panel
          title="Hồ sơ thành viên"
          action={
            <Link
              href="/ho-so"
              className="text-sm font-semibold text-gold-700 underline underline-offset-4 transition hover:text-gold-600"
            >
              Cập nhật
            </Link>
          }
        >
          <dl className="grid gap-6 sm:grid-cols-2">
            <Field label="Số điện thoại" value={record?.phone ?? "—"} />
            <Field
              label="Giới tính"
              value={record?.gender ? GENDER_LABELS[record.gender] : "—"}
            />
            <Field
              label="Ngày sinh"
              value={record?.birthDate ? formatDate(record.birthDate) : "—"}
            />
            <Field label="Địa chỉ" value={fullAddress || "—"} />
          </dl>
        </Panel>

        <div id="don-hang" className="scroll-mt-24">
          <Panel
            title="Đơn hàng của tôi"
            action={
              <Link
                href="/san-pham"
                className="text-sm font-semibold text-gold-700 underline underline-offset-4 transition hover:text-gold-600"
              >
                Mua thêm
              </Link>
            }
          >
            {orders ? (
              <MyOrders orders={orders} />
            ) : (
              <p className="text-sm text-black/55">
                Chưa tải được danh sách đơn hàng. Vui lòng thử lại sau.
              </p>
            )}
          </Panel>
        </div>

        <Panel title="Thông tin tài khoản">
          <dl className="grid gap-6 sm:grid-cols-2">
            <Field
              label="Mã thành viên"
              value={`#${record?.id ?? session.user.id}`}
              mono
            />
            <Field
              label="Đăng nhập bằng"
              value={record?.provider ?? "google"}
            />
            <Field
              label="Ngày tham gia"
              value={formatDateTime(record?.createdAt)}
            />
            <Field
              label="Đăng nhập gần nhất"
              value={formatDateTime(record?.lastLoginAt)}
            />
            <Field
              label="Số lần đăng nhập"
              value={String(record?.loginCount ?? 1)}
            />
          </dl>
        </Panel>

        {history.length > 0 && (
          <Panel title={`${history.length} lần đăng nhập gần nhất`}>
            <ul className="divide-y divide-black/10">
              {history.map((event) => (
                <li
                  key={event.id}
                  className="flex items-center justify-between gap-4 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span>{formatDateTime(event.occurredAt)}</span>
                  <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-xs font-medium text-gold-800">
                    {event.provider}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </section>
    </>
  );
}
