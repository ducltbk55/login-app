import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { USER_ROLES, USER_STATUSES } from '../user.entity';
import type { UserRole, UserStatus } from '../user.entity';

export class ListUsersDto {
  /** Tìm theo email hoặc tên (khớp một phần, không phân biệt hoa thường). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @IsOptional()
  @IsIn(USER_STATUSES)
  status?: UserStatus;
}
