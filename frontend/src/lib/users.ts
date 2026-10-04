import { request, requestOptional, segment } from "./backend";

export type UserRole = "admin" | "user";
/** `inactive` = vừa đăng ký, chờ duyệt; `blocked` = bị khoá. */
export type UserStatus = "active" | "inactive" | "blocked";

export const USER_GENDERS = ["male", "female", "other"] as const;
export type UserGender = (typeof USER_GENDERS)[number];

/** Nhãn tiếng Việt cho giới tính. */
export const GENDER_LABELS: Record<UserGender, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

export type StoredUser = {
  /** Khoá chính số, tự tăng. */
  id: number;
  /** GUID định danh tài khoản — trước đây chính là cột `id`. */
  accountId: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;

  /* ---- hồ sơ do người dùng tự khai sau khi đăng nhập ---- */
  phone: string | null;
  gender: UserGender | null;
  /** `YYYY-MM-DD`. */
  birthDate: string | null;
  addressLine: string | null;
  provinceCode: string | null;
  wardCode: string | null;
  /** Đã khai đủ các trường bắt buộc chưa — backend suy ra. */
  profileCompleted: boolean;
};

export type ProfileInput = {
  phone: string;
  gender: UserGender;
  birthDate: string;
  addressLine: string;
  provinceCode: string;
  wardCode: string;
};

export type AddressOption = { code: string; name: string };

export type UserGroupRef = { id: number; name: string; slug: string };

/** Bản ghi kèm nhóm quyền, dùng cho trang chi tiết trong admin. */
export type StoredUserDetail = StoredUser & {
  groups: UserGroupRef[];
  permissions: string[];
};

export type LoginEvent = {
  id: number;
  userId: number;
  provider: string;
  occurredAt: string;
};

export type UserStats = {
  total: number;
  admins: number;
  /** Đang chờ duyệt (status = inactive). */
  pending: number;
  blocked: number;
};

export type ListUsersQuery = {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
};

/** Đăng ký (lần đầu) hoặc ghi nhận đăng nhập (các lần sau). */
/** Đăng nhập và đăng ký là hai luồng tách bạch ở backend. */
export type SyncMode = "login" | "register";

export async function registerOrLogin(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
  mode: SyncMode;
}): Promise<{ user: StoredUser; isNewUser: boolean }> {
  return request<{ user: StoredUser; isNewUser: boolean }>("/users/sync", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      name: input.name ?? null,
      image: input.image ?? null,
      provider: input.provider,
      mode: input.mode,
    }),
  });
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUserDetail | null> {
  return requestOptional<StoredUserDetail>(`/users/${segment(email)}`);
}

export async function getLoginHistory(
  email: string,
  limit = 5,
): Promise<LoginEvent[]> {
  const result = await requestOptional<{ items: LoginEvent[] }>(
    `/users/${segment(email)}/logins?limit=${limit}`,
  );
  return result?.items ?? [];
}

export async function listUsers(
  query: ListUsersQuery = {},
): Promise<StoredUser[]> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);

  const suffix = params.size > 0 ? `?${params}` : "";
  const result = await request<{ total: number; items: StoredUser[] }>(
    `/users${suffix}`,
  );
  return result.items;
}

export async function getUserStats(): Promise<UserStats> {
  return request<UserStats>("/users/stats");
}

export async function updateUser(
  email: string,
  input: { role?: UserRole; status?: UserStatus },
): Promise<StoredUserDetail> {
  return request<StoredUserDetail>(`/users/${segment(email)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

/** Thay toàn bộ danh sách nhóm quyền của user. */
export async function setUserGroups(
  email: string,
  groupIds: number[],
): Promise<StoredUserDetail> {
  return request<StoredUserDetail>(`/users/${segment(email)}/groups`, {
    method: "PUT",
    body: JSON.stringify({ groupIds }),
  });
}

/** Người dùng tự khai hồ sơ; không đụng tới vai trò và trạng thái. */
export async function updateProfile(
  email: string,
  input: ProfileInput,
): Promise<StoredUserDetail> {
  return request<StoredUserDetail>(`/users/${segment(email)}/profile`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function listProvinces(): Promise<AddressOption[]> {
  const result = await request<{ items: AddressOption[] }>(
    "/address/provinces",
  );
  return result.items;
}

export async function listWards(
  provinceCode: string,
): Promise<AddressOption[]> {
  const result = await request<{ items: AddressOption[] }>(
    `/address/wards?provinceCode=${segment(provinceCode)}`,
  );
  return result.items;
}
