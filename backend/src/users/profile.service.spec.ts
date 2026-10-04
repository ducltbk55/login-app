import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AddressService } from '../categories/address.service';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import {
  PROVINCE_CATEGORY_CODE,
  WARD_CATEGORY_CODE,
} from '../common/administrative';
import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { PermissionGroupsModule } from '../permission-groups/permission-groups.module';
import { UsersService } from './users.service';

describe('UsersService: hồ sơ thành viên', () => {
  let moduleRef: TestingModule;
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
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => testDatabaseConfig()],
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
    const province = await categories.create({
      code: PROVINCE_CATEGORY_CODE,
      name: 'Tỉnh, Thành phố',
    });
    const ward = await categories.create({
      code: WARD_CATEGORY_CODE,
      name: 'Phường, Xã',
      groupCategoryId: province.id,
    });
    const daNang = await details.create(province.id, {
      code: '48',
      name: 'Thành phố Đà Nẵng',
    });
    await details.create(province.id, { code: '01', name: 'Thành phố Hà Nội' });
    await details.create(ward.id, {
      code: 'HAI-CHAU',
      name: 'Phường Hải Châu',
      groupDetailId: daNang.id,
    });

    // Đăng ký rồi duyệt để tài khoản dùng được ngay trong các test bên dưới.
    await users.sync({
      email: EMAIL,
      name: 'An',
      provider: 'google',
      mode: 'register',
    });
    await users.update(EMAIL, { status: 'active' });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('tài khoản mới chưa hoàn tất hồ sơ', async () => {
    const user = await users.findByEmailOrFail(EMAIL);

    expect(user.profileCompleted).toBe(false);
    expect(user.phone).toBeNull();
    expect(user.gender).toBeNull();
    expect(user.birthDate).toBeNull();
    expect(user.addressLine).toBeNull();
  });

  it('khai đủ thì hồ sơ được đánh dấu hoàn tất', async () => {
    const updated = await users.updateProfile(EMAIL, profile);

    expect(updated.profileCompleted).toBe(true);
    expect(updated).toMatchObject(profile);
    // Đọc lại từ DB cũng phải thấy như vậy.
    expect((await users.findByEmailOrFail(EMAIL)).profileCompleted).toBe(true);
  });

  it('phường phải thuộc đúng tỉnh đã chọn', async () => {
    await expect(
      users.updateProfile(EMAIL, { ...profile, provinceCode: '01' }),
    ).rejects.toThrow(/không thuộc Thành phố Hà Nội/);
  });

  it('từ chối mã tỉnh không có thật', async () => {
    await expect(
      users.updateProfile(EMAIL, { ...profile, provinceCode: '99' }),
    ).rejects.toThrow(/Không tìm thấy tỉnh\/thành phố/);
  });

  it('từ chối ngày sinh ở tương lai', async () => {
    await expect(
      users.updateProfile(EMAIL, { ...profile, birthDate: '2999-01-01' }),
    ).rejects.toThrow(/không thể ở tương lai/);
  });

  it('cập nhật hồ sơ không đụng tới vai trò và trạng thái', async () => {
    await users.update(EMAIL, { role: 'admin', status: 'blocked' });
    const updated = await users.updateProfile(EMAIL, profile);

    expect(updated.role).toBe('admin');
    expect(updated.status).toBe('blocked');
  });

  it('sửa lại hồ sơ thì ghi đè giá trị cũ', async () => {
    await users.updateProfile(EMAIL, profile);
    const again = await users.updateProfile(EMAIL, {
      ...profile,
      phone: '0912000111',
      gender: 'female',
    });

    expect(again.phone).toBe('0912000111');
    expect(again.gender).toBe('female');
  });

  it('AddressService tra cứu được tên để hiển thị', async () => {
    expect((await address.listProvinces()).map((p) => p.code).sort()).toEqual([
      '01',
      '48',
    ]);
    expect(await address.listWards('48')).toEqual([
      { code: 'HAI-CHAU', name: 'Phường Hải Châu' },
    ]);
    expect(await address.listWards('01')).toEqual([]);
    expect(await address.describe('48', 'HAI-CHAU')).toEqual({
      province: 'Thành phố Đà Nẵng',
      ward: 'Phường Hải Châu',
    });
    expect(await address.describe(null, null)).toEqual({
      province: null,
      ward: null,
    });
  });
});
