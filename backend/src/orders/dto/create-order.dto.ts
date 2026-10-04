import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

import {
  MAX_LINE_QUANTITY,
  MAX_ORDER_LINES,
  PAYMENT_METHODS,
  type PaymentMethod,
} from '../order.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Chỉ id + số lượng: giá, tên… server tự đọc, không tin trình duyệt. */
export class OrderLineDto {
  @Type(() => Number)
  @IsInt({ message: 'Mã sản phẩm không hợp lệ' })
  @IsPositive()
  productId!: number;

  @Type(() => Number)
  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @IsPositive({ message: 'Số lượng phải lớn hơn 0' })
  @Max(MAX_LINE_QUANTITY, {
    message: `Mỗi sản phẩm tối đa ${MAX_LINE_QUANTITY}`,
  })
  quantity!: number;
}

/** Ràng buộc "không được để trống" nằm sát tên trường (xem save-article.dto.ts). */
export class CreateOrderDto {
  @MaxLength(120, { message: 'Họ tên tối đa 120 ký tự' })
  @IsString({ message: 'Vui lòng nhập họ tên' })
  @MinLength(1, { message: 'Vui lòng nhập họ tên' })
  @Transform(trim)
  customerName!: string;

  @Matches(/^[0-9+\s().-]{8,20}$/, { message: 'Số điện thoại không hợp lệ' })
  @IsString({ message: 'Vui lòng nhập số điện thoại' })
  @Transform(trim)
  customerPhone!: string;

  @IsOptional()
  @MaxLength(160)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(emptyToNull)
  customerEmail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Địa chỉ tối đa 300 ký tự' })
  @Transform(emptyToNull)
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Ghi chú tối đa 1000 ký tự' })
  @Transform(emptyToNull)
  note?: string | null;

  @IsIn(PAYMENT_METHODS, { message: 'Hãy chọn hình thức thanh toán' })
  paymentMethod!: PaymentMethod;

  /**
   * Email tài khoản đang đăng nhập. Do server Next điền từ phiên đăng nhập,
   * KHÔNG lấy từ form — xem app/(site)/dat-hang/actions.ts.
   */
  @IsOptional()
  @IsEmail()
  @Transform(emptyToNull)
  userEmail?: string | null;

  @IsArray({ message: 'Giỏ hàng không hợp lệ' })
  @ArrayMinSize(1, { message: 'Giỏ hàng đang trống' })
  @ArrayMaxSize(MAX_ORDER_LINES, {
    message: `Mỗi đơn tối đa ${MAX_ORDER_LINES} sản phẩm`,
  })
  @ValidateNested({ each: true })
  @Type(() => OrderLineDto)
  items!: OrderLineDto[];
}
