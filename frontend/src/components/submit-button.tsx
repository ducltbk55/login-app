"use client";

import { useFormStatus } from "react-dom";

import { BUTTON } from "@/lib/styles";

/** Nút submit tự khoá và đổi nhãn trong lúc server action đang chạy. */
export function SubmitButton({
  children,
  pendingLabel = "Đang lưu…",
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof BUTTON;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${BUTTON[variant]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
