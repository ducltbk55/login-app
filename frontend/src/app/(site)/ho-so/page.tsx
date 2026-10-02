import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/site/profile-form";
import { auth } from "@/auth";
import { COMPANY_NAME } from "@/lib/company";
import {
  findUserByEmail,
  listProvinces,
  listWards,
} from "@/lib/users";

export const metadata = {
  title: "Hồ sơ thành viên",
  description: `Cập nhật hồ sơ thành viên ${COMPANY_NAME}.`,
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await findUserByEmail(session.user.email);
  if (!user) redirect("/login");

  const [provinces, initialWards] = await Promise.all([
    listProvinces(),
    // Đã chọn tỉnh từ lần trước thì nạp sẵn phường để khỏi phải chọn lại.
    user.provinceCode ? listWards(user.provinceCode) : Promise.resolve([]),
  ]);

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Thành viên
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {user.profileCompleted ? "Hồ sơ của bạn" : "Hoàn tất hồ sơ"}
          </h1>
          <p className="mt-3 text-white/70">
            {user.profileCompleted
              ? "Cập nhật lại thông tin bất cứ lúc nào."
              : "Google chỉ cung cấp tên và email. Bổ sung vài thông tin nữa để chúng tôi phục vụ bạn tốt hơn."}
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-2xl border border-black/10 bg-gold-50/60 p-5">
          <p className="text-sm text-black/60">Đang đăng nhập với</p>
          <p className="mt-1 font-semibold">
            {user.name ?? "Thành viên"}{" "}
            <span className="font-normal text-black/50">· {user.email}</span>
          </p>
        </div>

        <ProfileForm
          user={user}
          provinces={provinces}
          initialWards={initialWards}
        />
      </section>
    </>
  );
}
