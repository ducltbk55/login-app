import { SiteAccount } from "@/components/site/site-account";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

/**
 * Khung của trang giới thiệu công ty (trang công khai).
 *
 * Route group `(site)` nên không thêm đoạn nào vào URL: trang chủ vẫn là `/`.
 * Các trang ứng dụng (`/login`, `/dashboard`, `/admin`) nằm ngoài nhóm này nên
 * không dính header/footer của cổng.
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white text-ink-900">
      <SiteHeader accountSlot={<SiteAccount />} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
