"use client";

import { useActionState, useState, useTransition } from "react";

import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  saveProfileAction,
  wardsOfProvince,
  type ProfileState,
} from "@/app/(site)/ho-so/actions";
import {
  GENDER_LABELS,
  USER_GENDERS,
  type AddressOption,
  type StoredUserDetail,
} from "@/lib/users";

const FIELD =
  "w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm " +
  "outline-none transition placeholder:text-black/35 " +
  "focus-visible:border-gold-500 focus-visible:ring-2 focus-visible:ring-gold-400/30";

const LABEL = "mb-1.5 block text-sm font-medium text-black/70";

/**
 * Form hoàn tất hồ sơ sau khi đăng nhập bằng Google.
 *
 * Phường/xã nạp theo tỉnh đang chọn bằng server action — 3.321 phường mà tải
 * hết về client thì nặng, còn mở endpoint công khai thì lộ dữ liệu không cần.
 */
export function ProfileForm({
  user,
  provinces,
  initialWards,
}: {
  user: StoredUserDetail;
  provinces: AddressOption[];
  /** Phường của tỉnh đã lưu, để lần sửa sau không phải chọn lại từ đầu. */
  initialWards: AddressOption[];
}) {
  const [state, formAction] = useActionState<ProfileState, FormData>(
    saveProfileAction,
    null,
  );

  const [provinceCode, setProvinceCode] = useState(user.provinceCode ?? "");
  const [wards, setWards] = useState<AddressOption[]>(initialWards);
  const [loadingWards, startLoadingWards] = useTransition();

  const onProvinceChange = (code: string) => {
    setProvinceCode(code);
    setWards([]);
    if (!code) return;

    startLoadingWards(async () => {
      setWards(await wardsOfProvince(code));
    });
  };

  const toOptions = (items: AddressOption[]) =>
    items.map((item) => ({ value: item.code, label: item.name }));

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="profile-phone" className={LABEL}>
            Số điện thoại *
          </label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            required
            maxLength={20}
            defaultValue={user.phone ?? ""}
            placeholder="0905123456"
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="profile-birth" className={LABEL}>
            Ngày sinh *
          </label>
          <input
            id="profile-birth"
            name="birthDate"
            type="date"
            required
            // Chặn ngay ở trình duyệt; backend vẫn kiểm tra lại.
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={user.birthDate ?? ""}
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <span className={LABEL}>Giới tính *</span>
        <div className="flex flex-wrap gap-2">
          {USER_GENDERS.map((gender) => (
            <label
              key={gender}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm transition has-checked:border-gold-500 has-checked:bg-gold-50 has-checked:font-semibold"
            >
              <input
                type="radio"
                name="gender"
                value={gender}
                required
                defaultChecked={user.gender === gender}
                className="size-4 accent-gold-600"
              />
              {GENDER_LABELS[gender]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className={LABEL}>Tỉnh / Thành phố *</span>
          <SearchableSelect
            name="provinceCode"
            required
            options={toOptions(provinces)}
            defaultValue={provinceCode}
            placeholder="— Chọn tỉnh/thành phố —"
            searchPlaceholder="Tìm tỉnh/thành phố…"
            onChange={onProvinceChange}
          />
        </div>

        <div>
          <span className={LABEL}>Phường / Xã *</span>
          {/* `key` buộc ô chọn dựng lại khi đổi tỉnh, nếu không nó giữ giá trị cũ */}
          <SearchableSelect
            key={provinceCode}
            name="wardCode"
            required
            disabled={!provinceCode || loadingWards}
            options={toOptions(wards)}
            defaultValue={
              provinceCode === user.provinceCode ? (user.wardCode ?? "") : ""
            }
            placeholder={
              !provinceCode
                ? "Chọn tỉnh/thành phố trước"
                : loadingWards
                  ? "Đang tải…"
                  : "— Chọn phường/xã —"
            }
            searchPlaceholder="Tìm phường/xã…"
            emptyLabel="Tỉnh này chưa có phường/xã"
          />
        </div>
      </div>

      <div>
        <label htmlFor="profile-address" className={LABEL}>
          Địa chỉ (số nhà, tên đường) *
        </label>
        <input
          id="profile-address"
          name="addressLine"
          required
          maxLength={200}
          defaultValue={user.addressLine ?? ""}
          placeholder="255 Hùng Vương"
          className={FIELD}
        />
      </div>

      {state?.error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-50 px-3 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <SaveButton completed={user.profileCompleted} />
    </form>
  );
}

function SaveButton({ completed }: { completed: boolean }) {
  return (
    <button
      type="submit"
      className="w-full cursor-pointer rounded-lg bg-ink-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-ink-800 sm:w-auto"
    >
      {completed ? "Lưu thay đổi" : "Hoàn tất hồ sơ"}
    </button>
  );
}
