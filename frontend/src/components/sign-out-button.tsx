import { signOutAction } from "@/app/actions";

/**
 * Nút xác nhận đăng xuất, luôn nằm trong hộp thoại xác nhận (khu quản trị và
 * trang giới thiệu đều dùng chung). Tách riêng vì form gọi server action phải
 * dựng ở server component rồi truyền xuống dropdown (client).
 */
export function SignOutButton() {
  return (
    <form action={signOutAction} className="w-full">
      <button
        type="submit"
        className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
      >
        Đăng xuất
      </button>
    </form>
  );
}
