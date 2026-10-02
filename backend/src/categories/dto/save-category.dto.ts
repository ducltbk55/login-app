import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsPositive,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CATEGORY_STATUSES } from '../category.entity';
import type { CategoryStatus } from '../category.entity';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Mã cho phép chữ, số, `_`, `-` và `.`; chuẩn hoá thành chữ hoa khi lưu. */
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]*$/;
const CODE_MESSAGE =
  'code bắt đầu bằng chữ hoặc số, chỉ gồm chữ, số, gạch ngang, gạch dưới và dấu chấm';

export class CreateCategoryDto {
  /** Bỏ trống thì tự sinh từ `name`. */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  @Transform(trim)
  code?: string;

  @IsString()
  @MinLength(1, { message: 'name không được để trống' })
  @MaxLength(120)
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptions?: string | null;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsIn(CATEGORY_STATUSES, { message: 'status chỉ nhận active hoặc inactive' })
  status?: CategoryStatus;

  /**
   * Danh mục dùng làm nhóm cho chi tiết. `null` = bỏ phân nhóm.
   * Không gửi lên = giữ nguyên (chỉ có nghĩa khi cập nhật).
   */
  @IsOptional()
  @IsInt()
  @IsPositive()
  groupCategoryId?: number | null;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(CODE_PATTERN, { message: CODE_MESSAGE })
  @Transform(trim)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'name không được để trống' })
  @MaxLength(120)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descriptions?: string | null;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsIn(CATEGORY_STATUSES, { message: 'status chỉ nhận active hoặc inactive' })
  status?: CategoryStatus;

  @IsOptional()
  @IsInt()
  @IsPositive()
  groupCategoryId?: number | null;
}

/**
 * Chi tiết danh mục có cùng tập trường (categoryId lấy từ URL), nên dùng lại
 * luôn DTO của danh mục thay vì chép thành hai lớp y hệt nhau.
 */
export class CreateCategoryDetailDto extends CreateCategoryDto {
  /**
   * Chi tiết thuộc danh mục nhóm mà bản ghi này được xếp vào.
   * Bắt buộc khi danh mục cha có `groupCategoryId`, cấm khi không có.
   */
  @IsOptional()
  @IsInt()
  @IsPositive()
  groupDetailId?: number | null;
}

export class UpdateCategoryDetailDto extends UpdateCategoryDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  groupDetailId?: number | null;
}
