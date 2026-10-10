import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { BATCH_STATUSES } from '../recruitment.entity';
import type { BatchStatus } from '../recruitment.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Ngày lịch thuần, không giờ: so sánh chuỗi là đúng thứ tự thời gian. */
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const DATE_MESSAGE = 'Ngày phải có dạng YYYY-MM-DD';
const STATUS_MESSAGE = 'status chỉ nhận draft, open hoặc closed';

/**
 * Thứ tự decorator có ý nghĩa: ràng buộc "không được để trống" phải nằm sát
 * tên trường — xem `common/validation.ts`.
 */
export class CreateBatchDto {
  @MaxLength(200, { message: 'Tên đợt tối đa 200 ký tự' })
  @IsString({ message: 'Tên đợt không được để trống' })
  @MinLength(1, { message: 'Tên đợt không được để trống' })
  @Transform(trim)
  name!: string;

  @IsOptional()
  @MaxLength(2000, { message: 'Mô tả tối đa 2000 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  description?: string | null;

  @Matches(DATE, { message: DATE_MESSAGE })
  @IsString({ message: 'Hãy chọn ngày bắt đầu' })
  startDate!: string;

  @Matches(DATE, { message: DATE_MESSAGE })
  @IsString({ message: 'Hãy chọn ngày kết thúc' })
  endDate!: string;

  @IsOptional()
  @IsIn(BATCH_STATUSES, { message: STATUS_MESSAGE })
  status?: BatchStatus;
}

export class UpdateBatchDto {
  @IsOptional()
  @MaxLength(200, { message: 'Tên đợt tối đa 200 ký tự' })
  @IsString()
  @MinLength(1, { message: 'Tên đợt không được để trống' })
  @Transform(trim)
  name?: string;

  @IsOptional()
  @MaxLength(2000, { message: 'Mô tả tối đa 2000 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  description?: string | null;

  @IsOptional()
  @Matches(DATE, { message: DATE_MESSAGE })
  startDate?: string;

  @IsOptional()
  @Matches(DATE, { message: DATE_MESSAGE })
  endDate?: string;

  @IsOptional()
  @IsIn(BATCH_STATUSES, { message: STATUS_MESSAGE })
  status?: BatchStatus;
}
