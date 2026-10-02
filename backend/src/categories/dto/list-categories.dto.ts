import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListCategoriesDto {
  @IsOptional()
  @IsString()
  @MaxLength(140)
  search?: string;

  /** Query string nên nhận cả "true"/"false" dạng chữ. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
