import { Type } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

import type { PageQuery } from '../../common/pagination';
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from '../order.entity';

export class ListOrdersDto implements PageQuery {
  /** Mã đơn, tên, số điện thoại hoặc email khách — không phân biệt dấu. */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES)
  paymentStatus?: PaymentStatus;

  /** Đơn của một tài khoản — trang cá nhân của khách dùng. */
  @IsOptional()
  @IsEmail()
  userEmail?: string;

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
