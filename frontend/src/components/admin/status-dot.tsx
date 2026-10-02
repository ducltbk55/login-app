import type { CategoryStatus } from "@/lib/categories";

/** Chấm tròn + nhãn: gọn hơn badge khi đứng trong một cột bảng. */
export function StatusDot({ status }: { status: CategoryStatus }) {
  const on = status === "active";

  return (
    <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
      <span
        className={`size-2 shrink-0 rounded-full ${
          on ? "bg-emerald-500" : "bg-admin-muted/50"
        }`}
      />
      <span className={on ? "" : "text-admin-muted"}>
        {on ? "Hoạt động" : "Đã tắt"}
      </span>
    </span>
  );
}
