"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { CardSection } from "@/components/admin/card-section";
import { CoverImageField } from "@/components/admin/cover-image-field";
import { GalleryField } from "@/components/admin/gallery-field";
import { AlertIcon } from "@/components/admin/icons";
import { RichTextEditor } from "@/components/admin/lazy-rich-text-editor";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { SpecsField } from "@/components/admin/specs-field";
import { VideoField } from "@/components/admin/video-field";
import { SubmitButton } from "@/components/submit-button";
import { formatVnd } from "@/lib/format";
import {
  MAX_GALLERY_IMAGES,
  PRODUCT_STATUS_LABELS,
  type Product,
  type ProductCategory,
  type ProductStatus,
} from "@/lib/products";
import { BUTTON, CHECKBOX, INPUT, LABEL_TEXT } from "@/lib/styles";

type FormState = { error?: string } | null;

const UPLOAD_URL = "/admin/products/images";

/** "YYYY-MM-DD" theo giờ địa phương cho `<input type="date">`. */
function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Chỉ giữ chữ số: "1.500.000 đ" → "1500000". */
const digitsOf = (value: string) =>
  value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/** "1500000" → "1.500.000" để dễ đọc khi gõ số tiền dài. */
const grouped = (digits: string) =>
  digits === "" ? "" : Number(digits).toLocaleString("vi-VN");

/**
 * Ô tiền VNĐ: hiển thị có dấu chấm phân cách, gửi lên chuỗi chữ số thuần qua
 * input ẩn cùng tên — server action khỏi phải đoán định dạng.
 */
function PriceInput({
  name,
  label,
  value,
  onChange,
  hint,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (digits: string) => void;
  hint?: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className={`mb-1.5 block ${LABEL_TEXT}`}>{label}</span>
      <div className="relative">
        <input
          inputMode="numeric"
          value={grouped(value)}
          onChange={(event) =>
            onChange(digitsOf(event.target.value).slice(0, 13))
          }
          placeholder="Để trống = Liên hệ"
          className={`${INPUT} pr-10 text-right tabular-nums`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 grid place-items-center text-xs text-admin-muted">
          ₫
        </span>
      </div>
      <input type="hidden" name={name} value={value} />
      {hint && (
        <span className="mt-1.5 block text-xs text-admin-muted">{hint}</span>
      )}
    </label>
  );
}

export function ProductForm({
  record,
  categories,
  specSuggestions = [],
  action,
  cancelHref,
  submitLabel,
  readOnly = false,
  canPublish = true,
}: {
  /** Có `record` là sửa, không có là thêm mới. */
  record?: Product;
  categories: ProductCategory[];
  /** Tên thông số đã dùng ở các sản phẩm khác, để gợi ý khi nhập. */
  specSuggestions?: string[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  cancelHref: string;
  submitLabel: string;
  /** Chỉ xem (thiếu PRODUCTS.WRITE): khoá mọi ô và ẩn nút lưu. */
  readOnly?: boolean;
  /**
   * Có PRODUCTS.PUBLISH không. Thiếu thì chỉ được giữ nguyên trạng thái hiện
   * tại (sản phẩm mới là Bản nháp) — server từ chối mọi lần đổi trạng thái.
   */
  canPublish?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const [price, setPrice] = useState(record?.price?.toString() ?? "");
  const [salePrice, setSalePrice] = useState(
    record?.salePrice?.toString() ?? "",
  );

  // Xem trước ngay trên form đúng thứ khách sẽ thấy, và báo sai trước khi gửi.
  const listed = price === "" ? null : Number(price);
  const sale = salePrice === "" ? null : Number(salePrice);
  let saleHint: React.ReactNode = "Bỏ trống nếu không khuyến mãi.";
  if (sale !== null && listed === null) {
    saleHint = (
      <span className="text-red-600 dark:text-red-400">
        Cần nhập giá niêm yết trước.
      </span>
    );
  } else if (sale !== null && listed !== null && sale >= listed) {
    saleHint = (
      <span className="text-red-600 dark:text-red-400">
        Phải thấp hơn giá niêm yết.
      </span>
    );
  } else if (sale !== null && listed !== null && listed > 0) {
    const percent = Math.max(1, Math.round(((listed - sale) / listed) * 100));
    saleHint = (
      <span>
        Khách thấy: <s>{formatVnd(listed)}</s>{" "}
        <strong className="text-red-600 dark:text-red-400">
          {formatVnd(sale)}
        </strong>{" "}
        (−{percent}%)
      </span>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <fieldset disabled={readOnly} className="min-w-0">
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <CardSection
              title="Thông tin sản phẩm"
              description="Phần hiển thị cho khách ở trang Product."
            >
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Tên sản phẩm *
                </span>
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={record?.name}
                  placeholder="Ví dụ: Phần mềm quản lý bán hàng"
                  className={`${INPUT} text-base font-medium`}
                />
              </label>

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Tóm tắt</span>
                <textarea
                  name="summary"
                  rows={3}
                  maxLength={500}
                  defaultValue={record?.summary ?? ""}
                  placeholder="Một hai câu nêu điểm chính, hiện dưới ảnh ở danh sách sản phẩm."
                  className={`${INPUT} resize-y`}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Tối đa 500 ký tự.
                </span>
              </label>

              {/* Không bọc trong <label>: bấm thanh công cụ sẽ bị label kéo focus đi. */}
              <div className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Mô tả chi tiết
                </span>
                <RichTextEditor
                  name="description"
                  defaultValue={record?.description ?? ""}
                  uploadUrl={UPLOAD_URL}
                  disabled={readOnly}
                />
              </div>
            </CardSection>

            <CardSection
              title="Bộ sưu tập ảnh"
              description="Hiện thành slideshow khi khách xem chi tiết sản phẩm."
            >
              <GalleryField
                name="gallery"
                defaultValue={record?.gallery ?? []}
                uploadUrl={UPLOAD_URL}
                max={MAX_GALLERY_IMAGES}
              />
            </CardSection>

            <CardSection
              title="Video giới thiệu"
              description="Hiện ở tab “Video” cạnh bộ sưu tập ảnh trên trang chi tiết."
            >
              <VideoField
                name="videoUrl"
                defaultValue={record?.videoUrl ?? null}
                title={record?.name}
              />
            </CardSection>

            <CardSection
              title="Thông số kỹ thuật"
              description="Mỗi sản phẩm tự đặt tên thông số riêng, vd. Camera: 200MP, Màn hình: 144Hz."
            >
              <SpecsField
                name="specs"
                defaultValue={record?.specs ?? []}
                suggestions={specSuggestions}
              />
            </CardSection>
          </div>

          <div className="space-y-5">
            <CardSection title="Phân loại">
              <div className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Lĩnh vực *</span>
                <SearchableSelect
                  name="categoryDetailId"
                  required
                  options={categories.map((category) => ({
                    value: String(category.id),
                    label: category.name,
                  }))}
                  defaultValue={
                    record?.categoryDetailId === undefined
                      ? ""
                      : String(record.categoryDetailId)
                  }
                  placeholder="— Chọn lĩnh vực —"
                  searchPlaceholder="Tìm lĩnh vực…"
                  emptyLabel="Chưa có lĩnh vực nào đang bật"
                />
                {categories.length === 0 && (
                  <span className="mt-1.5 block text-xs text-red-600 dark:text-red-400">
                    Chưa có lĩnh vực nào đang bật. Hãy thêm trong Danh mục →
                    Danh mục lĩnh vực sản phẩm (DM_LINH_VUC_SP).
                  </span>
                )}
              </div>

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Mã sản phẩm (SKU)
                </span>
                <input
                  name="sku"
                  maxLength={60}
                  defaultValue={record?.sku ?? ""}
                  placeholder="Tuỳ chọn, vd. ERP-STD"
                  className={`${INPUT} font-mono text-xs`}
                />
              </label>
            </CardSection>

            <CardSection title="Giá bán" description="Đơn vị VNĐ.">
              <PriceInput
                name="price"
                label="Giá niêm yết"
                value={price}
                onChange={setPrice}
                hint="Để trống thì trang ngoài hiện “Liên hệ”."
              />
              <PriceInput
                name="salePrice"
                label="Giá khuyến mãi"
                value={salePrice}
                onChange={setSalePrice}
                hint={saleHint}
              />
            </CardSection>

            <CardSection title="Bán hàng">
              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>Trạng thái</span>
                <SearchableSelect
                  name="status"
                  defaultValue={record?.status ?? "draft"}
                  // Không có quyền mở bán: chỉ còn đúng trạng thái hiện tại, để
                  // giá trị gửi lên luôn trùng với bản ghi.
                  disabled={!canPublish}
                  options={(canPublish
                    ? (Object.keys(PRODUCT_STATUS_LABELS) as ProductStatus[])
                    : [record?.status ?? "draft"]
                  ).map((value) => ({
                    value,
                    label: PRODUCT_STATUS_LABELS[value],
                  }))}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  {!canPublish && !readOnly
                    ? "Bạn không có quyền mở bán / ngừng bán."
                    : "Chỉ sản phẩm “Đang bán” hiện ở trang ngoài."}
                </span>
              </label>

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Ngày ra mắt
                </span>
                <input
                  name="launchedAt"
                  type="date"
                  defaultValue={toDateInput(record?.launchedAt ?? null)}
                  className={INPUT}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Dùng để sắp xếp “Mới ra mắt”. Để trống thì tính theo ngày tạo.
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-admin-border bg-admin-surface-2 p-3 transition hover:border-brand-300">
                <input
                  type="checkbox"
                  name="inStock"
                  defaultChecked={record?.inStock ?? true}
                  className={`${CHECKBOX} mt-0.5`}
                />
                <span>
                  <span className="block text-sm font-medium">Còn hàng</span>
                  <span className="block text-xs text-admin-muted">
                    Bỏ chọn thì vẫn hiện nhưng không cho thêm vào giỏ.
                  </span>
                </span>
              </label>
            </CardSection>

            <CardSection title="Hiển thị">
              <CoverImageField
                name="image"
                label="Ảnh đại diện"
                defaultValue={record?.image}
                uploadUrl={UPLOAD_URL}
                emptyHint="Bỏ trống thì trang ngoài hiện khối màu thay ảnh."
              />

              <label className="block text-sm">
                <span className={`mb-1.5 block ${LABEL_TEXT}`}>
                  Đường dẫn (slug)
                </span>
                <input
                  name="slug"
                  maxLength={160}
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  defaultValue={record?.slug ?? ""}
                  placeholder="tự sinh từ tên"
                  className={`${INPUT} font-mono text-xs`}
                />
                <span className="mt-1.5 block text-xs text-admin-muted">
                  Địa chỉ: /san-pham/&lt;slug&gt;. Đổi slug sẽ làm hỏng link đã
                  chia sẻ trước đó.
                </span>
              </label>
            </CardSection>
          </div>
        </div>
      </fieldset>

      {state?.error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-600 dark:text-red-400"
        >
          <AlertIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-col-reverse gap-3 border-t border-admin-border bg-admin-surface/90 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:justify-end sm:rounded-xl sm:border sm:px-4">
        <Link
          href={cancelHref}
          className={`${BUTTON.secondary} w-full sm:w-auto`}
        >
          {readOnly ? "Quay lại" : "Huỷ"}
        </Link>
        {!readOnly && (
          <SubmitButton className="w-full sm:w-auto">
            {submitLabel}
          </SubmitButton>
        )}
      </div>
    </form>
  );
}
