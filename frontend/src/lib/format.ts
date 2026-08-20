const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** Hiển thị mốc thời gian ISO theo giờ Việt Nam, "—" nếu chưa có. */
export function formatDateTime(value?: string): string {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}
