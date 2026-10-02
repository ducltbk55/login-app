import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

import { CONTACT_STATUSES } from '../contact.entity';
import type { ContactStatus } from '../contact.entity';

const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

/** Admin chỉ đổi được trạng thái và ghi chú nội bộ, không sửa lời người gửi. */
export class UpdateContactDto {
  @IsOptional()
  @IsIn(CONTACT_STATUSES, {
    message: 'status chỉ nhận new, in_progress, resolved hoặc rejected',
  })
  status?: ContactStatus;

  @IsOptional()
  @MaxLength(2000, { message: 'Ghi chú tối đa 2000 ký tự' })
  @IsString()
  @Transform(emptyToNull)
  note?: string | null;

  /** Email admin thao tác, frontend tự điền từ phiên đăng nhập. */
  @IsOptional()
  @MaxLength(160)
  @IsString()
  @Transform(emptyToNull)
  handledBy?: string | null;
}
