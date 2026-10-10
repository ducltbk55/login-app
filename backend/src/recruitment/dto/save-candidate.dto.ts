import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CANDIDATE_STATUSES } from '../recruitment.entity';
import type { CandidateStatus } from '../recruitment.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/**
 * Hồ sơ nộp từ trang ngoài, dạng multipart (mọi trường là chuỗi, CV là tệp).
 * Thứ tự decorator có ý nghĩa — xem `common/validation.ts`.
 */
export class CreateCandidateDto {
  @IsPositive({ message: 'Vị trí ứng tuyển không hợp lệ' })
  @IsInt({ message: 'Vị trí ứng tuyển không hợp lệ' })
  @Type(() => Number)
  jobId!: number;

  @MaxLength(120, { message: 'Họ tên tối đa 120 ký tự' })
  @IsString({ message: 'Họ tên không được để trống' })
  @MinLength(1, { message: 'Họ tên không được để trống' })
  @Transform(trim)
  fullName!: string;

  @MaxLength(160, { message: 'Email tối đa 160 ký tự' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(trim)
  email!: string;

  @Matches(/^[0-9+().\s-]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  @IsString({ message: 'Số điện thoại không được để trống' })
  @Transform(trim)
  phone!: string;

  @IsOptional()
  @MaxLength(50)
  @IsString()
  @Transform(emptyToNull)
  experience?: string | null;

  @IsOptional()
  @MaxLength(300, { message: 'Link tối đa 300 ký tự' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Link portfolio phải bắt đầu bằng http:// hoặc https://' },
  )
  @Transform(emptyToNull)
  portfolioUrl?: string | null;

  @IsOptional()
  @MaxLength(5000, { message: 'Thư giới thiệu tối đa 5000 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  coverLetter?: string | null;
}

/** Người tuyển dụng chỉ đổi phần xử lý, không sửa lời ứng viên. */
export class UpdateCandidateDto {
  @IsOptional()
  @IsIn(CANDIDATE_STATUSES, { message: 'Trạng thái ứng viên không hợp lệ' })
  status?: CandidateStatus;

  @IsOptional()
  @IsISO8601({}, { message: 'Lịch phỏng vấn không hợp lệ' })
  @Transform(emptyToNull)
  interviewAt?: string | null;

  @IsOptional()
  @MaxLength(4000, { message: 'Ghi chú tối đa 4000 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  note?: string | null;

  /**
   * Gửi email báo ứng viên khi đổi bước (hoặc đổi lịch phỏng vấn). Mặc định
   * KHÔNG gửi: email ra ngoài không thu hồi được, phải là chủ ý của người bấm.
   */
  @IsOptional()
  @IsBoolean()
  notify?: boolean;

  /** Lời nhắn gửi kèm email — khác `note` là ghi chú nội bộ. */
  @IsOptional()
  @MaxLength(2000, { message: 'Lời nhắn tối đa 2000 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  message?: string | null;

  /** Email người thao tác, frontend tự điền từ phiên đăng nhập. */
  @IsOptional()
  @MaxLength(160)
  @IsString()
  @Transform(emptyToNull)
  handledBy?: string | null;
}
