/**
 * Menu của trang giới thiệu.
 *
 * Để ở module riêng (không có "use client") vì cả header (client) lẫn footer
 * (server) đều dùng: khi server component import một hằng số từ module client,
 * thứ đi qua ranh giới RSC là tham chiếu client chứ không phải mảng thật.
 */
export type NavItem = {
  href: string;
  label: string;
  /** Trang chủ phải so khớp tuyệt đối, nếu không mọi đường dẫn đều "đang ở". */
  exact?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", exact: true },
  { href: "/about", label: "About Us" },
  { href: "/tin-tuc", label: "Tin Tức" },
  { href: "/tuyen-dung", label: "Tuyển dụng" },
  { href: "/lien-he", label: "Liên hệ" },
];
