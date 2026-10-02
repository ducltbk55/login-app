import { request, requestOptional, segment } from "./backend";

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "blocked";

export type StoredUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
};

export type UserGroupRef = { id: string; name: string; slug: string };

/** Bản ghi kèm nhóm quyền, dùng cho trang chi tiết trong admin. */
export type StoredUserDetail = StoredUser & {
  groups: UserGroupRef[];
  permissions: string[];
};

export type LoginEvent = {
  id: string;
  userId: string;
  provider: string;
  occurredAt: string;
};

export type UserStats = { total: number; admins: number; blocked: number };

export type ListUsersQuery = {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
};

/** Đăng ký (lần đầu) hoặc ghi nhận đăng nhập (các lần sau). */
export async function registerOrLogin(input: {
  email: string;
  name?: string | null;
  image?: string | null;
  provider: string;
}): Promise<{ user: StoredUser; isNewUser: boolean }> {
  return request<{ user: StoredUser; isNewUser: boolean }>("/users/sync", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      name: input.name ?? null,
      image: input.image ?? null,
      provider: input.provider,
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
  groupIds: string[],
): Promise<StoredUserDetail> {
  return request<StoredUserDetail>(`/users/${segment(email)}/groups`, {
    method: "PUT",
    body: JSON.stringify({ groupIds }),
  });
}
