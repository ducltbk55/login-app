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

const dateOnlyFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "long",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** Chỉ ngày, dùng cho tin tức. Cố định múi giờ để server và client khớp nhau. */
export function formatDate(value?: string): string {
  if (!value) return "—";
  return dateOnlyFormatter.format(new Date(value));
}
