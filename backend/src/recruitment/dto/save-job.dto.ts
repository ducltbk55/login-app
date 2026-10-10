import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { JOB_STATUSES } from '../recruitment.entity';
import type { JobStatus } from '../recruitment.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MESSAGE =
  'slug chỉ gồm chữ thường, số và dấu gạch ngang ở giữa (vd: lap-trinh-vien)';
const STATUS_MESSAGE = 'status chỉ nhận open hoặc closed';

/** Thứ tự decorator có ý nghĩa — xem `common/validation.ts`. */
export class CreateJobDto {
  @IsInt({ message: 'Hãy chọn đợt tuyển dụng' })
  @IsPositive({ message: 'Hãy chọn đợt tuyển dụng' })
  batchId!: number;

  /** Bỏ trống thì tự sinh từ `title`. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @Transform(trim)
  slug?: string;

  @MaxLength(200, { message: 'Chức danh tối đa 200 ký tự' })
  @IsString({ message: 'Chức danh không được để trống' })
  @MinLength(1, { message: 'Chức danh không được để trống' })
  @Transform(trim)
  title!: string;

  @IsOptional()
  @MaxLength(120, { message: 'Phòng ban tối đa 120 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  department?: string | null;

  @MaxLength(60, { message: 'Cấp bậc tối đa 60 ký tự' })
  @IsString({ message: 'Cấp bậc không được để trống' })
  @MinLength(1, { message: 'Cấp bậc không được để trống' })
  @Transform(trim)
  level!: string;

  @MaxLength(60, { message: 'Hình thức tối đa 60 ký tự' })
  @IsString({ message: 'Hình thức làm việc không được để trống' })
  @MinLength(1, { message: 'Hình thức làm việc không được để trống' })
  @Transform(trim)
  employmentType!: string;

  @MaxLength(120, { message: 'Nơi làm việc tối đa 120 ký tự' })
  @IsString({ message: 'Nơi làm việc không được để trống' })
  @MinLength(1, { message: 'Nơi làm việc không được để trống' })
  @Transform(trim)
  location!: string;

  @IsOptional()
  @MaxLength(120, { message: 'Mức lương tối đa 120 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  salary?: string | null;

  @Max(999, { message: 'Số lượng tối đa 999' })
  @Min(1, { message: 'Số lượng cần tuyển ít nhất là 1' })
  @IsInt({ message: 'Số lượng cần tuyển phải là số nguyên' })
  @Type(() => Number)
  openings!: number;

  @IsOptional()
  @MaxLength(500, { message: 'Tóm tắt tối đa 500 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  summary?: string | null;

  /** Mỗi dòng một yêu cầu. */
  @IsOptional()
  @MaxLength(3000, { message: 'Yêu cầu tối đa 3000 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  requirements?: string | null;

  @IsString({ message: 'Mô tả công việc không được để trống' })
  @MinLength(1, { message: 'Mô tả công việc không được để trống' })
  @Transform(trim)
  description!: string;

  @IsOptional()
  @IsIn(JOB_STATUSES, { message: STATUS_MESSAGE })
  status?: JobStatus;
}

/** Sửa vị trí: mọi trường đều tuỳ chọn, không gửi thì giữ nguyên. */
export class UpdateJobDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  batchId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @Transform(trim)
  slug?: string;

  @IsOptional()
  @MaxLength(200, { message: 'Chức danh tối đa 200 ký tự' })
  @IsString()
  @MinLength(1, { message: 'Chức danh không được để trống' })
  @Transform(trim)
  title?: string;

  @IsOptional()
  @MaxLength(120)
  @IsString()
  @Transform(emptyToNull)
  department?: string | null;

  @IsOptional()
  @MaxLength(60)
  @IsString()
  @MinLength(1, { message: 'Cấp bậc không được để trống' })
  @Transform(trim)
  level?: string;

  @IsOptional()
  @MaxLength(60)
  @IsString()
  @MinLength(1, { message: 'Hình thức làm việc không được để trống' })
  @Transform(trim)
  employmentType?: string;

  @IsOptional()
  @MaxLength(120)
  @IsString()
  @MinLength(1, { message: 'Nơi làm việc không được để trống' })
  @Transform(trim)
  location?: string;

  @IsOptional()
  @MaxLength(120)
  @IsString()
  @Transform(emptyToNull)
  salary?: string | null;

  @IsOptional()
  @Max(999, { message: 'Số lượng tối đa 999' })
  @Min(1, { message: 'Số lượng cần tuyển ít nhất là 1' })
  @IsInt()
  @Type(() => Number)
  openings?: number;

  @IsOptional()
  @MaxLength(500)
  @IsString()
  @Transform(emptyToNull)
  summary?: string | null;

  @IsOptional()
  @MaxLength(3000)
  @IsString()
  @Transform(emptyToNull)
  requirements?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Mô tả công việc không được để trống' })
  @Transform(trim)
  description?: string;

  @IsOptional()
  @IsIn(JOB_STATUSES, { message: STATUS_MESSAGE })
  status?: JobStatus;
}
