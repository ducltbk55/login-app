import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DatabaseModule } from '../database/database.module';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let users: UsersService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-users-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
        }),
        DatabaseModule,
      ],
      providers: [UsersService],
    }).compile();

    await moduleRef.init();
    users = moduleRef.get(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('đăng ký người dùng mới ở lần đồng bộ đầu tiên', () => {
    const result = users.sync({
      email: 'an@example.com',
      name: 'An',
      image: null,
      provider: 'google',
    });

    expect(result.isNewUser).toBe(true);
    expect(result.user.email).toBe('an@example.com');
    expect(result.user.loginCount).toBe(1);
    expect(users.countAll()).toBe(1);
  });

  it('lần sau chỉ ghi nhận đăng nhập, không tạo bản ghi trùng', () => {
    users.sync({ email: 'an@example.com', name: 'An', provider: 'google' });
    const second = users.sync({
      email: 'an@example.com',
      name: 'An Nguyễn',
      image: 'https://example.com/a.png',
      provider: 'google',
    });

    expect(second.isNewUser).toBe(false);
    expect(second.user.loginCount).toBe(2);
    expect(second.user.name).toBe('An Nguyễn');
    expect(second.user.image).toBe('https://example.com/a.png');
    expect(users.countAll()).toBe(1);
  });

  it('lưu lịch sử đăng nhập cho từng lần', () => {
    users.sync({ email: 'an@example.com', provider: 'google' });
    users.sync({ email: 'an@example.com', provider: 'google' });

    expect(users.findLoginHistory('an@example.com')).toHaveLength(2);
  });

  it('giới hạn số dòng lịch sử trả về', () => {
    for (let i = 0; i < 3; i++) {
      users.sync({ email: 'an@example.com', provider: 'google' });
    }

    expect(users.findLoginHistory('an@example.com', 2)).toHaveLength(2);
    // limit không hợp lệ được đưa về khoảng cho phép thay vì lọt vào SQL.
    expect(users.findLoginHistory('an@example.com', 0)).toHaveLength(1);
    expect(users.findLoginHistory('an@example.com', 9999)).toHaveLength(3);
  });

  it('báo lỗi khi email chưa tồn tại', () => {
    expect(() => users.findByEmailOrFail('unknown@example.com')).toThrow(
      /Không tìm thấy người dùng/,
    );
  });
});
