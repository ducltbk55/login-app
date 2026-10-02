import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { DevLoginGuard } from './dev-login.guard';

/** Giả ConfigService chỉ trả đúng giá trị DEV_LOGIN cần thử. */
function guardWith(value: string | undefined): DevLoginGuard {
  const config = { get: () => value } as unknown as ConfigService;
  return new DevLoginGuard(config);
}

describe('DevLoginGuard', () => {
  it('bật khi DEV_LOGIN=on', () => {
    expect(guardWith('on').canActivate()).toBe(true);
  });

  it('mặc định tắt khi không cấu hình gì', () => {
    expect(() => guardWith(undefined).canActivate()).toThrow(
      ForbiddenException,
    );
  });

  // Các giá trị "nghe có vẻ bật" vẫn phải tắt: chỉ đúng chữ 'on' mới mở cổng,
  // tránh việc gõ nhầm lại vô tình bật tính năng mạo danh.
  it.each(['off', 'true', '1', 'yes', 'ON', 'On', ''])(
    'tắt với DEV_LOGIN=%p',
    (value) => {
      expect(() => guardWith(value).canActivate()).toThrow(ForbiddenException);
    },
  );

  it('thông báo chỉ rõ cách bật', () => {
    expect(() => guardWith(undefined).canActivate()).toThrow(
      /DEV_LOGIN=on trong backend\/\.env\.local/,
    );
  });
});
