import { CartView } from "@/components/site/cart-view";

export const metadata = { title: "Giỏ hàng" };

export default function CartPage() {
  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Product
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Giỏ hàng
          </h1>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Giỏ nằm trong localStorage nên toàn bộ phần này chạy phía trình duyệt. */}
        <CartView />
      </section>
    </>
  );
}
