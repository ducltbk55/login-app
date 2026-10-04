"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { formatVndShort } from "@/lib/format";
import {
  productsHref,
  type ProductFilterValues,
} from "@/lib/product-filters";
import {
  PRICE_SLIDER_MAX,
  PRICE_SLIDER_STEP,
  PRODUCT_SORT_LABELS,
  PRODUCT_SORTS,
  type ProductCategory,
  type ProductSort,
} from "@/lib/products";

/** Hai con trượt chồng lên nhau trên cùng một rãnh: giá từ – giá đến. */
function PriceRange({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const percent = (value: number) => (value / PRICE_SLIDER_MAX) * 100;

  return (
    <div>
      <div className="flex items-center justify-between text-sm font-medium tabular-nums">
        <span>{formatVndShort(min)}</span>
        <span>
          {max >= PRICE_SLIDER_MAX
            ? `${formatVndShort(PRICE_SLIDER_MAX)}+`
            : formatVndShort(max)}
        </span>
      </div>

      <div className="price-range relative mt-3 h-5">
        {/* Rãnh nền và đoạn đã chọn */}
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-black/10" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gold-500"
          style={{ left: `${percent(min)}%`, right: `${100 - percent(max)}%` }}
        />
        <input
          type="range"
          aria-label="Giá từ"
          min={0}
          max={PRICE_SLIDER_MAX}
          step={PRICE_SLIDER_STEP}
          value={min}
          // Không cho hai con trượt vượt qua nhau.
          onChange={(event) =>
            onChange(Math.min(Number(event.target.value), max - PRICE_SLIDER_STEP), max)
          }
        />
        <input
          type="range"
          aria-label="Giá đến"
          min={0}
          max={PRICE_SLIDER_MAX}
          step={PRICE_SLIDER_STEP}
          value={max}
          onChange={(event) =>
            onChange(min, Math.max(Number(event.target.value), min + PRICE_SLIDER_STEP))
          }
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-black/45">
        <span>0đ</span>
        <span>100 triệu</span>
      </div>
    </div>
  );
}

export function ProductFilters({
  categories,
  values,
}: {
  categories: ProductCategory[];
  values: ProductFilterValues;
}) {
  const router = useRouter();
  // Bộ lọc được render hai lần (điện thoại + màn rộng) nên id phải riêng.
  const searchId = useId();
  const [search, setSearch] = useState(values.search);
  const [categoryDetailId, setCategoryDetailId] = useState(values.categoryDetailId);
  const [price, setPrice] = useState({ min: values.minPrice, max: values.maxPrice });

  const total = categories.reduce((sum, c) => sum + c.productCount, 0);
  const dirty =
    values.search !== "" ||
    values.categoryDetailId !== undefined ||
    values.minPrice > 0 ||
    values.maxPrice < PRICE_SLIDER_MAX;

  const apply = (next: Partial<ProductFilterValues> = {}) => {
    router.push(
      productsHref({
        search: search.trim(),
        categoryDetailId,
        minPrice: price.min,
        maxPrice: price.max,
        sort: values.sort,
        ...next,
      }),
      { scroll: false },
    );
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
      className="space-y-6"
    >
      <div>
        <label htmlFor={searchId} className="text-sm font-semibold">
          Tên sản phẩm
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nhập tên cần tìm…"
          maxLength={140}
          className="mt-2 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none transition focus:border-gold-500 focus:ring-2 focus:ring-gold-200"
        />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">Lĩnh vực</legend>
        <ul className="mt-2 space-y-1">
          {[{ id: undefined, name: "Tất cả", productCount: total }, ...categories].map(
            (category) => {
              const checked = categoryDetailId === category.id;
              return (
                <li key={category.id ?? "all"}>
                  <label
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
                      checked
                        ? "bg-ink-900 font-medium text-white"
                        : "text-black/70 hover:bg-black/5"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`${searchId}-linh-vuc`}
                        checked={checked}
                        // Chọn lĩnh vực là lọc ngay, không cần bấm Áp dụng.
                        onChange={() => {
                          setCategoryDetailId(category.id);
                          apply({ categoryDetailId: category.id });
                        }}
                        className="sr-only"
                      />
                      {category.name}
                    </span>
                    <span className="text-xs tabular-nums opacity-60">
                      {category.productCount}
                    </span>
                  </label>
                </li>
              );
            },
          )}
        </ul>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold">Giá thành</legend>
        <div className="mt-3">
          <PriceRange
            min={price.min}
            max={price.max}
            onChange={(min, max) => setPrice({ min, max })}
          />
        </div>
      </fieldset>

      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 cursor-pointer rounded-lg bg-ink-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-ink-800"
        >
          Áp dụng
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setCategoryDetailId(undefined);
              setPrice({ min: 0, max: PRICE_SLIDER_MAX });
              router.push(
                productsHref({
                  search: "",
                  minPrice: 0,
                  maxPrice: PRICE_SLIDER_MAX,
                  sort: values.sort,
                }),
                { scroll: false },
              );
            }}
            className="cursor-pointer rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium text-black/70 transition hover:bg-black/5"
          >
            Xoá lọc
          </button>
        )}
      </div>
    </form>
  );
}

/** Ô sắp xếp phía trên lưới; đổi là áp dụng ngay, giữ nguyên bộ lọc. */
export function ProductSortSelect({ values }: { values: ProductFilterValues }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-black/55">Sắp xếp</span>
      <select
        value={values.sort}
        onChange={(event) =>
          router.push(
            productsHref({ ...values, sort: event.target.value as ProductSort }),
            { scroll: false },
          )
        }
        className="cursor-pointer rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-gold-500"
      >
        {PRODUCT_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {PRODUCT_SORT_LABELS[sort]}
          </option>
        ))}
      </select>
    </label>
  );
}
