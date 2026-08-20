import { signOutAction } from "@/app/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="cursor-pointer rounded-full border border-black/10 px-5 py-2 text-sm font-medium transition hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/20 dark:hover:bg-white/10"
      >
        Đăng xuất
      </button>
    </form>
  );
}
