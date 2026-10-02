import {
  CanActivate,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Cổng độc lập cho tính năng đăng nhập-theo-id của frontend.
 *
 * Cố tình KHÔNG dựa vào `NODE_ENV`: `npm run start:prod` ở đây là
 * `node dist/main`, không hề đặt biến đó, nên một kiểm tra kiểu
 * `NODE_ENV !== 'production'` sẽ luôn đúng ngay trên máy chủ thật.
 *
 * Thay vào đó là cờ bật tường minh, mặc định TẮT: thiếu cấu hình thì tính năng
 * không tồn tại. Đây là lớp phòng thủ thứ hai, nằm ở tiến trình giữ dữ liệu —
 * frontend có bị lừa (giả header `Host`, `NODE_ENV` sai) thì vẫn không lấy
 * được người dùng để mạo danh.
 */
@Injectable()
export class DevLoginGuard implements CanActivate {
  private readonly logger = new Logger(DevLoginGuard.name);

  constructor(private readonly config: ConfigService) {}

  canActivate(): boolean {
    if (this.config.get<string>('DEV_LOGIN') === 'on') return true;

    this.logger.warn(
      'Có request tới /dev-login nhưng DEV_LOGIN chưa bật — đã từ chối',
    );
    // 403 chứ không phải 404: ApiKeyGuard đã chạy trước nên ai tới được đây
    // vốn đã có khoá nội bộ, giấu sự tồn tại của endpoint không được gì thêm.
    // Đổi lại, frontend phân biệt được "backend tắt cờ" với "không có id này".
    throw new ForbiddenException(
      'Đăng nhập theo id đang tắt. Đặt DEV_LOGIN=on trong backend/.env.local để bật.',
    );
  }
}
