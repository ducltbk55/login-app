"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { BackendError } from "@/lib/backend";
import {
  listWards,
  updateProfile,
  USER_GENDERS,
  type AddressOption,
  type UserGender,
} from "@/lib/users";

export type ProfileState = { error?: string } | null;

/**
 * Nạp phường/xã của một tỉnh cho ô chọn ở client.
 *
 * Là server action chứ không phải route handler: API key của backend chỉ tồn
 * tại phía server, và cách này khỏi phải mở thêm endpoint công khai.
 */
export async function wardsOfProvince(
  provinceCode: string,
): Promise<AddressOption[]> {
  const session = await auth();
  if (!session?.user?.email) return [];

  return listWards(provinceCode);
}

export async function saveProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const session = await auth();
  // Hồ sơ luôn là của chính người đang đăng nhập; không nhận email từ form.
  const email = session?.user?.email;
  if (!email) redirect("/login");

  const gender = String(formData.get("gender") ?? "");
  if (!USER_GENDERS.includes(gender as UserGender)) {
    return { error: "Vui lòng chọn giới tính." };
  }

  const input = {
    phone: String(formData.get("phone") ?? "").trim(),
    gender: gender as UserGender,
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    addressLine: String(formData.get("addressLine") ?? "").trim(),
    provinceCode: String(formData.get("provinceCode") ?? "").trim(),
    wardCode: String(formData.get("wardCode") ?? "").trim(),
  };

  if (!input.provinceCode || !input.wardCode) {
    return { error: "Vui lòng chọn tỉnh/thành phố và phường/xã." };
  }

  try {
    await updateProfile(email, input);
  } catch (error) {
    if (error instanceof BackendError) return { error: error.message };
    throw error;
  }

  refresh();
  redirect("/dashboard");
}
