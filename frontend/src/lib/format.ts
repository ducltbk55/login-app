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

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Chữ thuần của nội dung HTML (bài viết soạn bằng CKEditor) — cho đoạn trích
 * và thẻ meta. Chỉ dùng để HIỂN THỊ DẠNG CHỮ, không phải bộ lọc an toàn.
 */
export function textOfHtml(html: string): string {
  return html
    .replace(
      /<(br|\/p|\/h\d|\/li|\/td|\/th|\/blockquote|\/figcaption)\b[^>]*>/gi,
      " ",
    )
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
      if (code[0] !== "#") return NAMED_ENTITIES[code.toLowerCase()] ?? match;
      const point =
        code[1] === "x" || code[1] === "X"
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isFinite(point) && point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

const VND = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

/** 1500000 → "1.500.000 ₫". */
export function formatVnd(value: number): string {
  return VND.format(value);
}

/** Nhãn gọn cho ô kéo giá: 0 → "0đ", 2_500_000 → "2,5 triệu". */
export function formatVndShort(value: number): string {
  if (value === 0) return "0đ";
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  }
  return `${(value / 1_000).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} nghìn`;
}
