import { Transform } from 'class-transformer';
import {
  IsIn,
  IsISO8601,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { USER_GENDERS } from '../user.entity';
import type { UserGender } from '../user.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * Hồ sơ người dùng tự khai sau khi đăng nhập.
 *
 * Mọi trường đều bắt buộc: đây là bước "hoàn tất hồ sơ", nộp thiếu thì coi như
 * chưa xong. Muốn sửa lẻ từng trường thì dùng chính endpoint này và gửi lại đủ.
 */
export class UpdateProfileDto {
  /** Bỏ khoảng trắng và dấu chấm để lưu dạng thuần số. */
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[\s.()-]/g, '') : value,
  )
  @IsString()
  @Matches(/^(0|\+84)\d{8,10}$/, {
    message: 'Số điện thoại không hợp lệ (ví dụ 0905123456)',
  })
  phone!: string;

  @IsIn(USER_GENDERS, { message: 'gender chỉ nhận male, female hoặc other' })
  gender!: UserGender;

  @IsISO8601(
    { strict: true },
    { message: 'Ngày sinh phải theo định dạng YYYY-MM-DD' },
  )
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Ngày sinh phải theo định dạng YYYY-MM-DD',
  })
  birthDate!: string;

  @IsString()
  @MinLength(3, { message: 'Địa chỉ quá ngắn' })
  @MaxLength(200)
  @Transform(trim)
  addressLine!: string;

  @IsString()
  @MaxLength(60)
  @Transform(trim)
  provinceCode!: string;

  @IsString()
  @MaxLength(60)
  @Transform(trim)
  wardCode!: string;
}
