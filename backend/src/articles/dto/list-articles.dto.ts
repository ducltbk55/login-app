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
import { ARTICLE_STATUSES } from '../article.entity';
import type { ArticleStatus } from '../article.entity';

/** Query string chỉ có chuỗi, nên "true"/"1" cũng phải hiểu là true. */
const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

export class ListArticlesDto implements PageQuery {
  /** Khớp không phân biệt hoa thường và dấu, trên tiêu đề / sapo / tác giả. */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @IsIn(ARTICLE_STATUSES, {
    message: 'status chỉ nhận draft, published hoặc archived',
  })
  status?: ArticleStatus;

  /** Lọc theo chuyên mục (chi tiết của `DM_CHUYEN_MUC`). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryDetailId?: number;

  /**
   * Chỉ lấy bài đang hiển thị ở trang ngoài: đã xuất bản và tới giờ đăng.
   * Trang Tin tức dùng cờ này thay vì tự lọc, để quy tắc "thế nào là đang lên
   * sóng" chỉ nằm một chỗ.
   */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  live?: boolean;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  featured?: boolean;

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
