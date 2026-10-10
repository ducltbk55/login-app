import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

import type { PageQuery } from '../../common/pagination';
import {
  BATCH_STATUSES,
  CANDIDATE_STATUSES,
  JOB_STATUSES,
} from '../recruitment.entity';
import type {
  BatchStatus,
  CandidateStatus,
  JobStatus,
} from '../recruitment.entity';

/** Query string luôn là chuỗi: "true"/"1" mới là bật. */
const toBoolean = ({ value }: { value: unknown }) =>
  value === true || value === 'true' || value === '1';

class Paged implements PageQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pageSize?: number;
}

export class ListBatchesDto extends Paged {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @IsIn(BATCH_STATUSES, { message: 'status chỉ nhận draft, open hoặc closed' })
  status?: BatchStatus;
}

export class ListJobsDto extends Paged {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  batchId?: number;

  @IsOptional()
  @IsIn(JOB_STATUSES, { message: 'status chỉ nhận open hoặc closed' })
  status?: JobStatus;

  /** Chỉ vị trí đang nhận hồ sơ — cho trang Tuyển dụng ngoài. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  accepting?: boolean;
}

export class ListCandidatesDto extends Paged {
  /** Khớp không phân biệt hoa thường và dấu: tên, email, SĐT, chức danh. */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @IsIn(CANDIDATE_STATUSES, { message: 'Trạng thái ứng viên không hợp lệ' })
  status?: CandidateStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  batchId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  jobId?: number;
}
