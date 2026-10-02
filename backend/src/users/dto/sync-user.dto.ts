import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { SYNC_MODES } from '../user.entity';
import type { SyncMode } from '../user.entity';

export class SyncUserDto {
  @IsEmail({}, { message: 'email không hợp lệ' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string | null;

  @IsIn(['google'], { message: 'provider hiện chỉ hỗ trợ "google"' })
  provider!: string;

  /**
   * `register` tạo tài khoản mới ở trạng thái chờ duyệt và từ chối nếu email
   * đã có; `login` yêu cầu tài khoản tồn tại và đang hoạt động.
   */
  @IsIn(SYNC_MODES, { message: 'mode chỉ nhận login hoặc register' })
  mode!: SyncMode;
}
