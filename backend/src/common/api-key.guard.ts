import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { timingSafeEqual } from 'node:crypto';

/** So sánh không phụ thuộc thời gian để không lộ dần khoá qua thời gian phản hồi. */
function matches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Chỉ cho phép các service nội bộ (Next.js server) gọi API:
 * client phải gửi header `x-api-key` trùng với BACKEND_API_KEY.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('BACKEND_API_KEY');
    if (!expected) {
      throw new InternalServerErrorException(
        'Thiếu BACKEND_API_KEY trong cấu hình của backend',
      );
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.header('x-api-key');
    if (!provided || !matches(provided, expected)) {
      throw new UnauthorizedException('x-api-key không hợp lệ');
    }
    return true;
  }
}
