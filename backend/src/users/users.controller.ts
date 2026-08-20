import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import { SyncUserDto } from './dto/sync-user.dto';
import type { LoginEvent, SyncResult, User } from './user.entity';
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

  @Get()
  findAll(): { total: number; items: User[] } {
    return { total: this.users.countAll(), items: this.users.findAll() };
  }

  @Get(':email')
  findOne(@Param('email') email: string): User {
    return this.users.findByEmailOrFail(email);
  }

  @Get(':email/logins')
  findLogins(
    @Param('email') email: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ): { items: LoginEvent[] } {
    return { items: this.users.findLoginHistory(email, limit) };
  }
}
