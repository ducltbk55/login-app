/**
 * Tài khoản admin có sẵn khi deploy, chép từ DB local ngày 2026-10-04.
 *
 * Đăng nhập Google được nhận diện theo email, nên lần đăng nhập đầu tiên sẽ
 * vào thẳng bản ghi này với quyền admin, khỏi phải chạy `npm run set-role`.
 */
export type UserSeed = {
  accountId: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  createdAt: string;
  lastLoginAt: string;
  loginCount: number;
  phone: string | null;
  gender: string | null;
  birthDate: string | null;
  addressLine: string | null;
  provinceCode: string | null;
  wardCode: string | null;
};

export const ADMIN_USERS: UserSeed[] = [
  {
    accountId: '1692d436-f893-40ae-9621-61d8d872131b',
    email: 'ductk198@gmail.com',
    name: 'Đức Lê',
    image:
      'https://lh3.googleusercontent.com/a/ACg8ocJwLx5CJVPgDy1kyXVogqJ83rGIuMJ_LE1L9l4QKfoQlgZE-8oH=s96-c',
    provider: 'google',
    role: 'admin',
    status: 'active',
    createdAt: '2026-10-04T13:37:40.585Z',
    lastLoginAt: '2026-10-04T13:38:38.138Z',
    loginCount: 1,
    phone: '0982190892',
    gender: 'male',
    birthDate: '1992-07-21',
    addressLine: 'Xóm Đồng Văn',
    provinceCode: '40',
    wardCode: '17287',
  },
];
