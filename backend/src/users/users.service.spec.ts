import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesModule } from '../categories/categories.module';
import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { PermissionGroupsModule } from '../permission-groups/permission-groups.module';
import { PermissionGroupsService } from '../permission-groups/permission-groups.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let users: UsersService;
  let groups: PermissionGroupsService;

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
    groups = moduleRef.get(PermissionGroupsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  /** Đăng ký rồi duyệt — tài khoản dùng được ngay, như hành vi trước đây. */
  const registerApproved = async (email: string, name?: string) => {
    await users.sync({ email, name, provider: 'google', mode: 'register' });
    return users.update(email, { status: 'active' });
  };

  const login = (
    email: string,
    extra: { name?: string; image?: string } = {},
  ) => users.sync({ email, provider: 'google', mode: 'login', ...extra });

  it('đăng ký tạo tài khoản ở trạng thái chờ duyệt', async () => {
    const result = await users.sync({
      email: 'an@example.com',
      name: 'An',
      image: null,
      provider: 'google',
      mode: 'register',
    });

    expect(result.isNewUser).toBe(true);
    expect(result.user.email).toBe('an@example.com');
    expect(result.user.status).toBe('inactive');
    expect(result.user.role).toBe('user');
    // Chưa duyệt thì chưa đăng nhập được lần nào.
    expect(result.user.loginCount).toBe(0);
    expect(await users.findLoginHistory('an@example.com')).toHaveLength(0);
    expect(await users.countAll()).toBe(1);
  });

  it('đăng ký lại bằng email đã có thì bị từ chối', async () => {
    await users.sync({
      email: 'an@example.com',
      provider: 'google',
      mode: 'register',
    });

    await expect(
      users.sync({
        email: 'an@example.com',
        provider: 'google',
        mode: 'register',
      }),
    ).rejects.toThrow(/đã đăng ký/);
    expect(await users.countAll()).toBe(1);
  });

  it('chưa đăng ký thì không đăng nhập được', async () => {
    await expect(login('la@example.com')).rejects.toThrow(/chưa đăng ký/);
    expect(await users.countAll()).toBe(0);
  });

  it('chờ duyệt thì chưa đăng nhập được', async () => {
    await users.sync({
      email: 'an@example.com',
      provider: 'google',
      mode: 'register',
    });

    await expect(login('an@example.com')).rejects.toThrow(
      /chờ quản trị viên duyệt/,
    );
  });

  it('duyệt xong thì đăng nhập được và cập nhật tên/ảnh', async () => {
    await registerApproved('an@example.com', 'An');
    const second = await login('an@example.com', {
      name: 'An Nguyễn',
      image: 'https://example.com/a.png',
    });

    expect(second.isNewUser).toBe(false);
    expect(second.user.loginCount).toBe(1);
    expect(second.user.name).toBe('An Nguyễn');
    expect(second.user.image).toBe('https://example.com/a.png');
    expect(await users.countAll()).toBe(1);
  });

  it('lưu lịch sử đăng nhập cho từng lần', async () => {
    await registerApproved('an@example.com');
    await login('an@example.com');
    await login('an@example.com');

    expect(await users.findLoginHistory('an@example.com')).toHaveLength(2);
  });

  it('giới hạn số dòng lịch sử trả về', async () => {
    await registerApproved('an@example.com');
    for (let i = 0; i < 3; i++) await login('an@example.com');

    expect(await users.findLoginHistory('an@example.com', 2)).toHaveLength(2);
    // limit không hợp lệ được đưa về khoảng cho phép thay vì lọt vào SQL.
    expect(await users.findLoginHistory('an@example.com', 0)).toHaveLength(1);
    expect(await users.findLoginHistory('an@example.com', 9999)).toHaveLength(
      3,
    );
  });

  it('báo lỗi khi email chưa tồn tại', async () => {
    await expect(
      users.findByEmailOrFail('unknown@example.com'),
    ).rejects.toThrow(/Không tìm thấy người dùng/);
  });

  describe('quản trị', () => {
    beforeEach(async () => {
      await registerApproved('an@example.com', 'An');
    });

    it('đổi vai trò và trạng thái', async () => {
      const promoted = await users.update('an@example.com', { role: 'admin' });
      expect(promoted.role).toBe('admin');
      // Admin được coi là có toàn bộ quyền dù chưa gán nhóm nào.
      expect(promoted.permissions.length).toBeGreaterThan(0);
      expect(await users.stats()).toMatchObject({
        total: 1,
        admins: 1,
        blocked: 0,
      });
    });

    it('không cho hạ quyền admin cuối cùng', async () => {
      await users.update('an@example.com', { role: 'admin' });

      await expect(
        users.update('an@example.com', { role: 'user' }),
      ).rejects.toThrow(/admin duy nhất/);
      await expect(
        users.update('an@example.com', { status: 'blocked' }),
      ).rejects.toThrow(/admin duy nhất/);
    });

    it('cho hạ quyền khi đã có admin khác', async () => {
      await registerApproved('binh@example.com');
      await users.update('an@example.com', { role: 'admin' });
      await users.update('binh@example.com', { role: 'admin' });

      expect(
        (await users.update('an@example.com', { role: 'user' })).role,
      ).toBe('user');
    });

    it('tài khoản bị khoá không đăng nhập được nữa', async () => {
      await registerApproved('binh@example.com');
      await login('binh@example.com');
      await users.update('binh@example.com', { status: 'blocked' });

      await expect(login('binh@example.com')).rejects.toThrow(/bị khoá/);
      // Không được ghi thêm lịch sử đăng nhập cho lần bị chặn.
      expect(await users.findLoginHistory('binh@example.com')).toHaveLength(1);
    });

    it('hạ về chờ duyệt thì cũng không đăng nhập được', async () => {
      await registerApproved('binh@example.com');
      await users.update('binh@example.com', { status: 'inactive' });

      await expect(login('binh@example.com')).rejects.toThrow(
        /chờ quản trị viên duyệt/,
      );
    });

    it('gán nhóm quyền và tính quyền hiệu lực', async () => {
      const group = await groups.create({
        name: 'Biên tập danh mục',
        permissions: ['CATEGORIES.READ', 'CATEGORIES.WRITE'],
      });

      const detail = await users.setGroups('an@example.com', {
        groupIds: [group.id],
      });

      expect(detail.groups.map((g) => g.slug)).toEqual(['bien-tap-danh-muc']);
      expect(detail.permissions).toEqual([
        'CATEGORIES.READ',
        'CATEGORIES.WRITE',
      ]);
      expect((await groups.findOneOrFail(group.id)).memberCount).toBe(1);
    });

    it('gán nhóm là thay thế toàn bộ, không cộng dồn', async () => {
      const a = await groups.create({ name: 'A', permissions: ['USERS.READ'] });
      const b = await groups.create({
        name: 'B',
        permissions: ['CATEGORIES.READ'],
      });

      await users.setGroups('an@example.com', { groupIds: [a.id] });
      const after = await users.setGroups('an@example.com', {
        groupIds: [b.id],
      });

      expect(after.groups).toHaveLength(1);
      expect(after.permissions).toEqual(['CATEGORIES.READ']);
    });

    it('từ chối gán nhóm không tồn tại', async () => {
      await expect(
        users.setGroups('an@example.com', { groupIds: [9999] }),
      ).rejects.toThrow(/Không tìm thấy nhóm quyền/);
    });

    it('lọc danh sách theo tên, vai trò, trạng thái', async () => {
      await registerApproved('binh@example.com', 'Bình');
      await users.update('binh@example.com', { role: 'admin' });

      expect(
        (await users.findAll({ search: 'bình' })).map((u) => u.email),
      ).toEqual(['binh@example.com']);
      expect(await users.findAll({ role: 'admin' })).toHaveLength(1);
      expect(await users.findAll({ status: 'blocked' })).toHaveLength(0);
      expect(await users.findAll()).toHaveLength(2);
    });
  });
});
