import type { ReactNode } from "react";

import { ContactForm } from "@/components/site/contact-form";
import {
  COMPANY_ADDRESS,
  COMPANY_NAME,
  COMPANY_PROFILE,
} from "@/lib/company";

export const metadata = {
  title: "Liên hệ",
  description: `Liên hệ ${COMPANY_NAME}: ${COMPANY_ADDRESS}.`,
};

/** Dẫn tới Google Maps bằng truy vấn địa chỉ, không nhúng iframe bên thứ ba. */
const MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  COMPANY_ADDRESS,
)}`;

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <p className="text-xs font-semibold tracking-wider text-gold-700 uppercase">
        {label}
      </p>
      <div className="mt-2 text-sm text-black/70">{children}</div>
    </div>
  );
}

function pickOne(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ContactPage(props: PageProps<"/lien-he">) {
  // Giỏ hàng và nút "Liên hệ báo giá" chuyển sang đây kèm chủ đề / nội dung
  // điền sẵn. Cắt theo đúng giới hạn của form để không bị từ chối khi gửi.
  const params = await props.searchParams;
  const initialSubject = pickOne(params["chu-de"])?.slice(0, 160);
  const initialMessage = pickOne(params["noi-dung"])?.slice(0, 5000);

  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            Liên hệ
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            Nói chuyện với chúng tôi
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Gửi vài dòng về bài toán của bạn, hoặc ghé văn phòng tại{" "}
            {COMPANY_PROFILE.city}. Chúng tôi phản hồi trong giờ làm việc.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Thông tin liên hệ */}
          <div className="space-y-4 lg:col-span-2">
            <InfoCard label="Văn phòng">
              <p>{COMPANY_PROFILE.address}</p>
              <p>
                {COMPANY_PROFILE.ward}, {COMPANY_PROFILE.city}
              </p>
              <a
                href={MAP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block font-semibold text-gold-700 underline underline-offset-4 transition hover:text-gold-600"
              >
                Xem trên Google Maps
              </a>
            </InfoCard>

            <InfoCard label="Điện thoại">
              <a
                href={`tel:${COMPANY_PROFILE.phone.replace(/\s/g, "")}`}
                className="font-semibold transition hover:text-gold-700"
              >
                {COMPANY_PROFILE.phone}
              </a>
            </InfoCard>

            <InfoCard label="Email">
              <a
                href={`mailto:${COMPANY_PROFILE.email}`}
                className="font-semibold break-all transition hover:text-gold-700"
              >
                {COMPANY_PROFILE.email}
              </a>
            </InfoCard>

            <InfoCard label="Giờ làm việc">
              <p>{COMPANY_PROFILE.workingHours}</p>
              <p className="mt-1 text-black/45">
                Ngoài giờ, vui lòng để lại email — chúng tôi trả lời vào buổi
                làm việc kế tiếp.
              </p>
            </InfoCard>

            <InfoCard label={COMPANY_PROFILE.directorTitle}>
              <p className="font-semibold text-black">
                {COMPANY_PROFILE.director}
              </p>
              <p className="mt-1">
                Mã số thuế: {COMPANY_PROFILE.taxCode}
              </p>
            </InfoCard>
          </div>

          {/* Biểu mẫu */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-black/10 bg-gold-50/60 p-6 sm:p-10">
              <h2 className="text-2xl font-semibold tracking-tight">
                Gửi yêu cầu
              </h2>
              <p className="mt-2 text-sm text-black/60">
                Điền thông tin bên dưới, chúng tôi sẽ liên hệ lại sớm nhất.
              </p>
              <div className="mt-8">
                <ContactForm
                  initialSubject={initialSubject}
                  initialMessage={initialMessage}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
