import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from '../order.entity';

const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Ai thực hiện + ghi chú kèm theo — chung cho mọi thao tác của admin. */
class ActorDto {
  /** Tên/email admin, do server Next điền từ phiên đăng nhập. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(emptyToNull)
  actor?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Ghi chú tối đa 1000 ký tự' })
  @Transform(emptyToNull)
  note?: string | null;
}

export class UpdateOrderStatusDto extends ActorDto {
  @IsIn(ORDER_STATUSES, { message: 'Trạng thái đơn không hợp lệ' })
  status!: OrderStatus;
}

export class UpdatePaymentStatusDto extends ActorDto {
  @IsIn(PAYMENT_STATUSES, { message: 'Trạng thái thanh toán không hợp lệ' })
  paymentStatus!: PaymentStatus;
}

/** Ghi chú nội bộ: thay cả đoạn, đồng thời lưu một dòng lịch sử. */
export class UpdateAdminNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Ghi chú tối đa 2000 ký tự' })
  @Transform(emptyToNull)
  adminNote?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Transform(emptyToNull)
  actor?: string | null;
}
