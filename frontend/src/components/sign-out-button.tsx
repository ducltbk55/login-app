import { signOutAction } from "@/app/actions";

/**
 * `default` dùng cho các trang công khai; `confirm` là nút xác nhận trong hộp
 * thoại đăng xuất của khu quản trị.
 */
const VARIANTS = {
  default:
    "rounded-full border border-black/10 px-5 py-2 hover:bg-black/5 " +
    "focus-visible:ring-blue-500 dark:border-white/20 dark:hover:bg-white/10",
  confirm:
    "w-full justify-center rounded-lg bg-red-600 px-4 py-2 text-white " +
    "hover:bg-red-700 focus-visible:ring-red-500",
} as const;

export function SignOutButton({
  variant = "default",
}: {
  variant?: keyof typeof VARIANTS;
}) {
  return (
    <form action={signOutAction} className={variant === "confirm" ? "w-full" : undefined}>
      <button
        type="submit"
        className={`inline-flex cursor-pointer items-center text-sm font-medium transition focus:outline-none focus-visible:ring-2 ${VARIANTS[variant]}`}
      >
        Đăng xuất
      </button>
    </form>
  );
}
