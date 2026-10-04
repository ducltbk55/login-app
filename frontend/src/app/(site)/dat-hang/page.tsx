import { auth } from "@/auth";
import { CheckoutForm } from "@/components/site/checkout-form";
import { findUserByEmail, listProvinces, listWards } from "@/lib/users";
import type { CheckoutValues } from "./actions";

export const metadata = { title: "Đặt hàng" };

/**
 * Thông tin người nhận điền sẵn từ hồ sơ thành viên. Lỗi khi đọc hồ sơ thì
 * bỏ qua — khách vẫn tự nhập được, không chặn việc đặt hàng.
 */
async function profileDefaults(): Promise<{
  defaults: Partial<CheckoutValues>;
  loggedIn: boolean;
}> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { defaults: {}, loggedIn: false };

  try {
    const user = await findUserByEmail(email);
    let address = user?.addressLine ?? "";
    if (user?.provinceCode) {
      const [provinces, wards] = await Promise.all([
        listProvinces(),
        listWards(user.provinceCode),
      ]);
      address = [
        user.addressLine,
        wards.find((w) => w.code === user.wardCode)?.name,
        provinces.find((p) => p.code === user.provinceCode)?.name,
      ]
        .filter(Boolean)
        .join(", ");
    }

    return {
      loggedIn: true,
      defaults: {
        customerName: user?.name ?? session.user?.name ?? "",
        customerPhone: user?.phone ?? "",
        customerEmail: email,
        address,
      },
    };
  } catch {
    return {
      loggedIn: true,
      defaults: { customerName: session.user?.name ?? "", customerEmail: email },
    };
  }
}

export default async function CheckoutPage() {
  const { defaults, loggedIn } = await profileDefaults();

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Product
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Đặt hàng
          </h1>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CheckoutForm defaults={defaults} loggedIn={loggedIn} />
      </section>
    </>
  );
}
