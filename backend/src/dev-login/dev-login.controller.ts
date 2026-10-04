import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import type { User, UserDetail } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { DevLoginGuard } from './dev-login.guard';

/**
 * Endpoint riêng cho việc mạo danh lúc phát triển. Tách khỏi `/users` để chỉ
 * cần tắt `DEV_LOGIN` là cả nhánh này biến mất, không đụng gì tới API thường.
 *
 * Thứ tự guard có ý nghĩa: ApiKeyGuard chạy trước nên người ngoài không có
 * khoá nội bộ sẽ nhận 401, chưa kịp dò xem DEV_LOGIN đang bật hay tắt.
 */
@Controller('dev-login')
@UseGuards(ApiKeyGuard, DevLoginGuard)
export class DevLoginController {
  constructor(private readonly users: UsersService) {}

  /** Danh sách tài khoản để frontend dựng màn hình chọn. */
  @Get('users')
  async list(): Promise<{ total: number; items: User[] }> {
    const items = await this.users.findAll();
    return { total: items.length, items };
  }

  /** Một tài khoản theo id — thứ mà `/users/:email` không làm được. */
  @Get('users/:id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<UserDetail> {
    return this.users.findDetailByIdOrFail(id);
  }
}
