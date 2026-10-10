import {
  BriefcaseIcon,
  LayersIcon,
  MapPinIcon,
  WalletIcon,
} from "@/components/admin/icons";
import type { Job } from "@/lib/recruitment";

type Tone = "light" | "dark";

/**
 * Các chip thông tin của một vị trí: nơi làm, hình thức, cấp bậc, lương.
 * Không có hook nên dùng được ở cả server lẫn client component.
 */
export function JobMeta({
  job,
  tone = "light",
}: {
  job: Pick<Job, "location" | "employmentType" | "level" | "salary">;
  tone?: Tone;
}) {
  const items = [
    { icon: MapPinIcon, label: "Nơi làm việc", value: job.location },
    { icon: BriefcaseIcon, label: "Hình thức", value: job.employmentType },
    { icon: LayersIcon, label: "Cấp bậc", value: job.level },
    { icon: WalletIcon, label: "Mức lương", value: job.salary ?? "Thoả thuận" },
  ];

  return (
    <ul className="flex flex-wrap gap-2">
      {items.map(({ icon: Icon, label, value }) => (
        <li
          key={label}
          title={label}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            tone === "dark"
              ? "bg-white/10 text-white/85 ring-1 ring-white/15"
              : "bg-black/[0.04] text-black/70 ring-1 ring-black/[0.06]"
          }`}
        >
          <Icon
            className={`size-3.5 shrink-0 ${tone === "dark" ? "text-gold-300" : "text-gold-600"}`}
          />
          <span className="sr-only">{label}: </span>
          {value}
        </li>
      ))}
    </ul>
  );
}
