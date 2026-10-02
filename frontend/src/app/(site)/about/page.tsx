import Image from "next/image";

import {
  COMPANY_ADDRESS,
  COMPANY_LOGO,
  COMPANY_NAME,
  COMPANY_PROFILE,
  COMPANY_TAGLINE,
  yearsInBusiness,
} from "@/lib/company";
import { CORE_VALUES, MILESTONES, SERVICES } from "@/lib/site-content";

export const metadata = {
  title: "About Us",
  description: `Giới thiệu ${COMPANY_NAME}: thành lập năm ${COMPANY_PROFILE.foundedYear}, lĩnh vực ${COMPANY_PROFILE.industry}.`,
};

/** Dòng thông tin trong bảng hồ sơ công ty. */
function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-black/10 py-4 sm:flex-row sm:gap-6 sm:py-3">
      <dt className="shrink-0 text-sm text-black/50 sm:w-44">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="bg-ink-900 text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <p className="text-xs font-semibold tracking-wider text-gold-300 uppercase">
            About Us
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {COMPANY_NAME}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            {COMPANY_TAGLINE}
          </p>
        </div>
      </section>

      {/* Câu chuyện + hồ sơ */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-5">
          <div className="space-y-5 lg:col-span-3">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Chúng tôi là ai
            </h2>
            <p className="text-black/70">
              {COMPANY_NAME} được thành lập năm {COMPANY_PROFILE.foundedYear}{" "}
              tại {COMPANY_PROFILE.city}, hoạt động trong lĩnh vực{" "}
              {COMPANY_PROFILE.industry.toLowerCase()}. Sau{" "}
              {yearsInBusiness()} năm, công ty tập trung vào một việc: biến quy
              trình thủ công của doanh nghiệp thành hệ thống chạy được, đo được
              và bàn giao lại được.
            </p>
            <p className="text-black/70">
              Đội ngũ của chúng tôi làm trọn vòng đời sản phẩm — từ khảo sát
              nghiệp vụ, thiết kế, lập trình, kiểm thử cho tới vận hành và bảo
              trì. Khách hàng luôn nhận đủ mã nguồn và tài liệu để tự làm chủ hệ
              thống của mình.
            </p>

            <dl className="mt-8">
              <ProfileRow label="Tên công ty" value={COMPANY_NAME} />
              <ProfileRow
                label="Năm thành lập"
                value={String(COMPANY_PROFILE.foundedYear)}
              />
              <ProfileRow label="Lĩnh vực" value={COMPANY_PROFILE.industry} />
              <ProfileRow
                label={COMPANY_PROFILE.directorTitle}
                value={COMPANY_PROFILE.director}
              />
              <ProfileRow label="Địa chỉ" value={COMPANY_ADDRESS} />
              <ProfileRow label="Email" value={COMPANY_PROFILE.email} />
              <ProfileRow label="Điện thoại" value={COMPANY_PROFILE.phone} />
            </dl>
          </div>

          {/* Thẻ giám đốc */}
          <aside className="lg:col-span-2">
            <div className="sticky top-24 rounded-2xl border border-black/10 bg-gold-50/60 p-8 text-center">
              <Image
                src={COMPANY_LOGO}
                alt={`Logo ${COMPANY_NAME}`}
                width={192}
                height={192}
                className="mx-auto size-24 rounded-full"
              />
              <p className="mt-5 text-xs font-semibold tracking-wider text-gold-700 uppercase">
                {COMPANY_PROFILE.directorTitle}
              </p>
              <p className="mt-1 text-xl font-semibold">
                {COMPANY_PROFILE.director}
              </p>
              <p className="mt-4 text-sm text-black/60 italic">
                “Làm đúng việc khách hàng cần, bàn giao thứ họ dùng được lâu
                dài — đó là cách chúng tôi giữ khách.”
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Giá trị cốt lõi */}
      <section className="bg-gold-50/60">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Giá trị cốt lõi
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {CORE_VALUES.map((value) => (
              <div
                key={value.title}
                className="rounded-2xl border border-black/10 bg-white p-6"
              >
                <h3 className="text-base font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm text-black/60">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chặng đường */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Chặng đường phát triển
        </h2>

        <ol className="mt-10 space-y-0 border-l-2 border-gold-200">
          {MILESTONES.map((milestone) => (
            <li key={milestone.year} className="relative pb-8 pl-8 last:pb-0">
              <span
                aria-hidden
                className="absolute top-1 -left-[0.4375rem] size-3 rounded-full bg-gold-500 ring-4 ring-white"
              />
              <p className="text-sm font-semibold text-gold-700 tabular-nums">
                {milestone.year}
              </p>
              <p className="mt-1 max-w-2xl text-black/70">{milestone.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Dịch vụ tóm tắt */}
      <section className="border-t border-black/10">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Lĩnh vực hoạt động
          </h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {SERVICES.map((service) => (
              <li
                key={service.slug}
                className="flex gap-3 rounded-xl border border-black/10 p-5"
              >
                <span className="mt-2 size-2 shrink-0 rounded-full bg-gold-500" />
                <span>
                  <span className="block font-medium">{service.title}</span>
                  <span className="mt-1 block text-sm text-black/60">
                    {service.summary}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
