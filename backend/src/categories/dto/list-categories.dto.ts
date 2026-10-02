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
import { CATEGORY_STATUSES } from '../category.entity';
import type { CategoryStatus } from '../category.entity';

export class ListCategoriesDto implements PageQuery {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @IsIn(CATEGORY_STATUSES, { message: 'status chỉ nhận active hoặc inactive' })
  status?: CategoryStatus;

  /** 1-based; vượt quá số trang thì backend trả về trang cuối. */
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

export class ListCategoryDetailsDto extends ListCategoriesDto {
  /** Lọc theo nhóm (một chi tiết của danh mục nhóm). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  groupDetailId?: number;
}
