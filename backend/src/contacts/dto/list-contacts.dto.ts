import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

import type { PageQuery } from '../../common/pagination';
import { CONTACT_STATUSES } from '../contact.entity';
import type { ContactStatus } from '../contact.entity';

export class ListContactsDto implements PageQuery {
  /** Khớp không phân biệt hoa thường và dấu trên tên, email, chủ đề, nội dung. */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @IsIn(CONTACT_STATUSES, {
    message: 'status chỉ nhận new, in_progress, resolved hoặc rejected',
  })
  status?: ContactStatus;

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
