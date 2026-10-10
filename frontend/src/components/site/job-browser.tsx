"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  ChevronRightIcon,
  SearchIcon,
} from "@/components/admin/icons";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { JobMeta } from "@/components/site/job-meta";
import type { Job } from "@/lib/recruitment";

export type JobGroup = {
  batch: Job["batch"];
  /** "Còn 12 ngày"… — tính ở server theo giờ VN để khớp hạn thật. */
  deadline: string;
  /** Ngày kết thúc dạng 31/12/2026. */
  endLabel: string;
  jobs: Job[];
};

/** Bỏ dấu + chữ thường: "Đà Nẵng" khớp "da nang". */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
}

const SEARCH =
  "w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm outline-none transition focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400/30";

function JobRow({ job }: { job: Job }) {
  return (
    <li>
      <Link
        href={`/tuyen-dung/${job.slug}`}
        className="group flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 transition hover:border-gold-400/70 hover:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.25)] sm:flex-row sm:items-center sm:p-6"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-balance transition group-hover:text-gold-700">
              {job.title}
            </h3>
            {job.department && (
              <span className="text-sm text-black/45">{job.department}</span>
            )}
          </div>
          {job.summary && (
            <p className="mt-1.5 line-clamp-2 text-sm text-black/60">
              {job.summary}
            </p>
          )}
          <div className="mt-3">
            <JobMeta job={job} />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-black/[0.06] pt-4 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <span className="rounded-full bg-gold-100 px-3 py-1 text-xs font-semibold text-gold-800">
            Cần {job.openings} người
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-ink-900 transition group-hover:gap-2 group-hover:text-gold-700">
            Xem & ứng tuyển
            <ChevronRightIcon className="size-4" />
          </span>
        </div>
      </Link>
    </li>
  );
}

/** Danh sách vị trí gom theo đợt, kèm bộ lọc chạy ngay trên trình duyệt. */
export function JobBrowser({ groups }: { groups: JobGroup[] }) {
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");

  const all = groups.flatMap((group) => group.jobs);
  const departments = [
    ...new Set(all.map((job) => job.department).filter(Boolean)),
  ] as string[];
  const locations = [...new Set(all.map((job) => job.location))];

  const filtered = useMemo(() => {
    const needle = fold(query.trim());
    return groups
      .map((group) => ({
        ...group,
        jobs: group.jobs.filter(
          (job) =>
            (!department || job.department === department) &&
            (!location || job.location === location) &&
            (!needle ||
              fold(
                [job.title, job.summary, job.level, ...job.requirements].join(
                  " ",
                ),
              ).includes(needle)),
        ),
      }))
      .filter((group) => group.jobs.length > 0);
  }, [groups, query, department, location]);

  const shown = filtered.reduce((n, group) => n + group.jobs.length, 0);
  const filtering = Boolean(query || department || location);

  return (
    <div>
      <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_14rem_12rem] sm:p-5">
        <label className="relative block">
          <span className="sr-only">Tìm vị trí</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-black/35" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo chức danh, kỹ năng…"
            className={`${SEARCH} pl-10`}
          />
        </label>
        <SearchableSelect
          variant="site"
          name="department"
          value={department}
          onChange={setDepartment}
          options={[
            { value: "", label: "Tất cả phòng ban" },
            ...departments.map((value) => ({ value, label: value })),
          ]}
          searchPlaceholder="Tìm phòng ban…"
        />
        <SearchableSelect
          variant="site"
          name="location"
          value={location}
          onChange={setLocation}
          options={[
            { value: "", label: "Mọi địa điểm" },
            ...locations.map((value) => ({ value, label: value })),
          ]}
          searchPlaceholder="Tìm địa điểm…"
        />
      </div>

      <p className="mt-4 text-sm text-black/55" aria-live="polite">
        {filtering ? (
          <>
            Tìm thấy <strong className="text-black/80">{shown}</strong> /{" "}
            {all.length} vị trí ·{" "}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDepartment("");
                setLocation("");
              }}
              className="cursor-pointer font-semibold text-gold-700 underline-offset-4 hover:underline"
            >
              Xoá bộ lọc
            </button>
          </>
        ) : (
          <>
            <strong className="text-black/80">{all.length}</strong> vị trí đang
            nhận hồ sơ
          </>
        )}
      </p>

      <div className="mt-8 space-y-12">
        {filtered.map((group) => (
          <section key={group.batch.id} aria-labelledby={`dot-${group.batch.id}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3
                  id={`dot-${group.batch.id}`}
                  className="text-xl font-semibold tracking-tight"
                >
                  {group.batch.name}
                </h3>
                {group.batch.description && (
                  <p className="mt-1 max-w-3xl text-sm text-black/55">
                    {group.batch.description}
                  </p>
                )}
              </div>
              <p className="flex shrink-0 items-center gap-2 text-sm text-black/55">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                {group.deadline} · hạn {group.endLabel}
              </p>
            </div>
            <ul className="mt-5 space-y-3">
              {group.jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </ul>
          </section>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-black/20 px-6 py-14 text-center">
            <p className="font-semibold">Không có vị trí nào khớp bộ lọc</p>
            <p className="mt-1 text-sm text-black/55">
              Thử từ khoá khác hoặc bỏ bớt điều kiện lọc.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
