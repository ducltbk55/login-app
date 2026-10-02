import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Thứ tự decorator có ý nghĩa: `stopAtFirstError` chỉ báo ràng buộc đăng ký
 * đầu tiên, mà decorator đăng ký từ dưới lên — xem `common/validation.ts`.
 */
export class CreateContactDto {
  @MaxLength(120, { message: 'Họ tên tối đa 120 ký tự' })
  @IsString({ message: 'Họ tên không được để trống' })
  @MinLength(1, { message: 'Họ tên không được để trống' })
  @Transform(trim)
  name!: string;

  @MaxLength(160, { message: 'Email tối đa 160 ký tự' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(trim)
  email!: string;

  @IsOptional()
  @MaxLength(32, { message: 'Số điện thoại tối đa 32 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  phone?: string | null;

  @IsOptional()
  @MaxLength(160, { message: 'Chủ đề tối đa 160 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  subject?: string | null;

  @MaxLength(5000, { message: 'Nội dung tối đa 5000 ký tự' })
  @IsString({ message: 'Nội dung không được để trống' })
  @MinLength(1, { message: 'Nội dung không được để trống' })
  @Transform(trim)
  message!: string;
}
