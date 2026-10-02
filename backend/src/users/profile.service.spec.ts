import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { AddressService } from '../categories/address.service';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import {
  PROVINCE_CATEGORY_CODE,
  WARD_CATEGORY_CODE,
} from '../common/administrative';
import { DatabaseModule } from '../database/database.module';
import { PermissionGroupsModule } from '../permission-groups/permission-groups.module';
import { UsersService } from './users.service';

describe('UsersService: hồ sơ thành viên', () => {
  let moduleRef: TestingModule;
  let tempDir: string;
  let users: UsersService;
  let categories: CategoriesService;
  let details: CategoryDetailsService;
  let address: AddressService;

  const EMAIL = 'an@example.com';
  /** Hồ sơ hợp lệ tối thiểu, dùng lại ở nhiều test. */
  const profile = {
    phone: '0905123456',
    gender: 'male' as const,
    birthDate: '1995-04-20',
    addressLine: '255 Hùng Vương',
    provinceCode: '48',
    wardCode: 'HAI-CHAU',
  };

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-profile-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
        }),
        DatabaseModule,
        PermissionGroupsModule,
        CategoriesModule,
      ],
      providers: [UsersService],
    }).compile();

    await moduleRef.init();
    users = moduleRef.get(UsersService);
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);
    address = moduleRef.get(AddressService);

    // Dựng danh mục địa giới tối giản: 1 tỉnh có 1 phường, 1 tỉnh khác trống.
    const province = categories.create({
      code: PROVINCE_CATEGORY_CODE,
      name: 'Tỉnh, Thành phố',
    });
    const ward = categories.create({
      code: WARD_CATEGORY_CODE,
      name: 'Phường, Xã',
      groupCategoryId: province.id,
    });
    const daNang = details.create(province.id, {
      code: '48',
      name: 'Thành phố Đà Nẵng',
    });
    details.create(province.id, { code: '01', name: 'Thành phố Hà Nội' });
    details.create(ward.id, {
      code: 'HAI-CHAU',
      name: 'Phường Hải Châu',
      groupDetailId: daNang.id,
    });

    // Đăng ký rồi duyệt để tài khoản dùng được ngay trong các test bên dưới.
    users.sync({
      email: EMAIL,
      name: 'An',
      provider: 'google',
      mode: 'register',
    });
    users.update(EMAIL, { status: 'active' });
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('tài khoản mới chưa hoàn tất hồ sơ', () => {
    const user = users.findByEmailOrFail(EMAIL);

    expect(user.profileCompleted).toBe(false);
    expect(user.phone).toBeNull();
    expect(user.gender).toBeNull();
    expect(user.birthDate).toBeNull();
    expect(user.addressLine).toBeNull();
  });

  it('khai đủ thì hồ sơ được đánh dấu hoàn tất', () => {
    const updated = users.updateProfile(EMAIL, profile);

    expect(updated.profileCompleted).toBe(true);
    expect(updated).toMatchObject(profile);
    // Đọc lại từ DB cũng phải thấy như vậy.
    expect(users.findByEmailOrFail(EMAIL).profileCompleted).toBe(true);
  });

  it('phường phải thuộc đúng tỉnh đã chọn', () => {
    expect(() =>
      users.updateProfile(EMAIL, { ...profile, provinceCode: '01' }),
    ).toThrow(/không thuộc Thành phố Hà Nội/);
  });

  it('từ chối mã tỉnh không có thật', () => {
    expect(() =>
      users.updateProfile(EMAIL, { ...profile, provinceCode: '99' }),
    ).toThrow(/Không tìm thấy tỉnh\/thành phố/);
  });

  it('từ chối ngày sinh ở tương lai', () => {
    expect(() =>
      users.updateProfile(EMAIL, { ...profile, birthDate: '2999-01-01' }),
    ).toThrow(/không thể ở tương lai/);
  });

  it('cập nhật hồ sơ không đụng tới vai trò và trạng thái', () => {
    users.update(EMAIL, { role: 'admin', status: 'blocked' });
    const updated = users.updateProfile(EMAIL, profile);

    expect(updated.role).toBe('admin');
    expect(updated.status).toBe('blocked');
  });

  it('sửa lại hồ sơ thì ghi đè giá trị cũ', () => {
    users.updateProfile(EMAIL, profile);
    const again = users.updateProfile(EMAIL, {
      ...profile,
      phone: '0912000111',
      gender: 'female',
    });

    expect(again.phone).toBe('0912000111');
    expect(again.gender).toBe('female');
  });

  it('AddressService tra cứu được tên để hiển thị', () => {
    expect(
      address
        .listProvinces()
        .map((p) => p.code)
        .sort(),
    ).toEqual(['01', '48']);
    expect(address.listWards('48')).toEqual([
      { code: 'HAI-CHAU', name: 'Phường Hải Châu' },
    ]);
    expect(address.listWards('01')).toEqual([]);
    expect(address.describe('48', 'HAI-CHAU')).toEqual({
      province: 'Thành phố Đà Nẵng',
      ward: 'Phường Hải Châu',
    });
    expect(address.describe(null, null)).toEqual({
      province: null,
      ward: null,
    });
  });
});
