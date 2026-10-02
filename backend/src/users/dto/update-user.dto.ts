import { IsIn, IsOptional } from 'class-validator';

import { USER_ROLES, USER_STATUSES } from '../user.entity';
import type { UserRole, UserStatus } from '../user.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsIn(USER_ROLES, { message: `role chỉ nhận: ${USER_ROLES.join(', ')}` })
  role?: UserRole;

  @IsOptional()
  @IsIn(USER_STATUSES, {
    message: `status chỉ nhận: ${USER_STATUSES.join(', ')}`,
  })
  status?: UserStatus;
}
