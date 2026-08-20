export type User = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
};

export type LoginEvent = {
  id: string;
  userId: string;
  provider: string;
  occurredAt: string;
};

export type SyncResult = {
  user: User;
  isNewUser: boolean;
};
