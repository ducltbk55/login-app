import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import type { PageQuery } from '../../common/pagination';
import {
  MAX_PRICE,
  PRODUCT_SORTS,
  PRODUCT_STATUSES,
  type ProductSort,
  type ProductStatus,
} from '../product.entity';

/** Query string chỉ có chuỗi, nên "true"/"1" cũng phải hiểu là true. */
const toBoolean = ({ value }: { value: unknown }) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
};

/** `ids=3,7,9` → [3, 7, 9]. Phần tử không phải số nguyên dương bị loại. */
const toIdList = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
};

export class ListProductsDto implements PageQuery {
  /** Tên hoặc mã sản phẩm, không phân biệt hoa thường và dấu. */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @IsIn(PRODUCT_STATUSES, {
    message: 'status chỉ nhận draft, published hoặc archived',
  })
  status?: ProductStatus;

  /** Lọc theo lĩnh vực (chi tiết của `DM_LINH_VUC_SP`). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  categoryDetailId?: number;

  /**
   * Khoảng giá, so với giá khách thực trả (khuyến mãi nếu có). Đặt bất kỳ
   * cận nào thì sản phẩm chưa có giá ("Liên hệ") bị loại — không biết giá
   * thì không nói được nó có nằm trong khoảng hay không.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_PRICE)
  maxPrice?: number;

  /** Chỉ sản phẩm đang bán — trang ngoài luôn bật cờ này. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  live?: boolean;

  /** Lấy đúng các sản phẩm này (giỏ hàng đọc lại giá hiện hành). */
  @IsOptional()
  @Transform(toIdList)
  @IsInt({ each: true })
  @ArrayMaxSize(100)
  ids?: number[];

  @IsOptional()
  @IsIn(PRODUCT_SORTS, {
    message: `sort chỉ nhận ${PRODUCT_SORTS.join(', ')}`,
  })
  sort?: ProductSort;

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
