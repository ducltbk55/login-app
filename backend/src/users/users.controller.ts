import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import { AssignGroupsDto } from './dto/assign-groups.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type {
  LoginEvent,
  SyncResult,
  User,
  UserDetail,
  UserStats,
} from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(ApiKeyGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Được Next.js gọi sau khi Google xác thực thành công. */
  @Post('sync')
  @HttpCode(200)
  sync(@Body() dto: SyncUserDto): SyncResult {
    return this.users.sync(dto);
  }

  // Phải khai báo trước `:email`, nếu không "stats" sẽ bị hiểu là một email.
  @Get('stats')
  stats(): UserStats {
    return this.users.stats();
  }

  @Get()
  findAll(@Query() query: ListUsersDto): { total: number; items: User[] } {
    const items = this.users.findAll(query);
    return { total: items.length, items };
  }

  @Get(':email')
  findOne(@Param('email') email: string): UserDetail {
    return this.users.findDetailOrFail(email);
  }

  @Get(':email/logins')
  findLogins(
    @Param('email') email: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): { items: LoginEvent[] } {
    return { items: this.users.findLoginHistory(email, limit) };
  }

  /** Đổi vai trò / trạng thái (admin). */
  @Patch(':email')
  update(
    @Param('email') email: string,
    @Body() dto: UpdateUserDto,
  ): UserDetail {
    return this.users.update(email, dto);
  }

  /** Chủ tài khoản tự khai hồ sơ sau khi đăng nhập. */
  @Patch(':email/profile')
  updateProfile(
    @Param('email') email: string,
    @Body() dto: UpdateProfileDto,
  ): UserDetail {
    return this.users.updateProfile(email, dto);
  }

  /** Thay toàn bộ nhóm quyền của user (admin). */
  @Put(':email/groups')
  setGroups(
    @Param('email') email: string,
    @Body() dto: AssignGroupsDto,
  ): UserDetail {
    return this.users.setGroups(email, dto);
  }
}
