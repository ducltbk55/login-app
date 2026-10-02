import { Badge } from "@/components/badge";
import type { UserStatus } from "@/lib/users";

const STATUS: Record<
  UserStatus,
  { label: string; tone: "success" | "neutral" | "danger" }
> = {
  active: { label: "Đang hoạt động", tone: "success" },
  inactive: { label: "Chờ duyệt", tone: "neutral" },
  blocked: { label: "Đã khoá", tone: "danger" },
};

/** Nhãn trạng thái tài khoản; chờ duyệt khác hẳn bị khoá nên tách màu riêng. */
export function UserStatusBadge({ status }: { status: UserStatus }) {
  const { label, tone } = STATUS[status] ?? STATUS.inactive;
  return <Badge tone={tone}>{label}</Badge>;
}
