import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ARTICLE_STATUSES } from '../article.entity';
import type { ArticleStatus } from '../article.entity';

/**
 * Ảnh bìa: link http(s) bên ngoài, hoặc ảnh đã tải lên qua /articles/images
 * (phát ở /media/articles/<uuid>.<đuôi>). Chặn `javascript:`, `data:`, đường
 * dẫn tương đối tuỳ ý — giá trị này đi thẳng vào thẻ img và thẻ meta chia sẻ.
 */
const COVER_IMAGE =
  /^(https?:\/\/[^\s"'<>]+|\/media\/articles\/[0-9a-f-]{36}\.(jpg|png|gif|webp))$/;
const COVER_IMAGE_MESSAGE = 'Ảnh bìa phải là link http(s) hoặc ảnh đã tải lên';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Chuỗi rỗng từ form = "không có giá trị", đưa về null cho đồng nhất. */
const emptyToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_MESSAGE =
  'slug chỉ gồm chữ thường, số và dấu gạch ngang ở giữa (vd: tin-moi-nhat)';

/**
 * Thứ tự decorator có ý nghĩa: `stopAtFirstError` của ValidationPipe chỉ báo
 * ràng buộc ĐĂNG KÝ ĐẦU TIÊN của mỗi trường, mà decorator đăng ký từ dưới lên.
 * Vì vậy ràng buộc "không được để trống" phải nằm sát tên trường, nếu không ô
 * bỏ trống sẽ nhận thông báo "tối đa N ký tự" chẳng ăn nhập gì.
 */
export class CreateArticleDto {
  /** Chi tiết của danh mục `DM_CHUYEN_MUC`. */
  @IsInt({ message: 'Hãy chọn chuyên mục cho bài viết' })
  categoryDetailId!: number;

  /** Bỏ trống thì tự sinh từ `title`. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @Transform(trim)
  slug?: string;

  @MaxLength(200, { message: 'Tiêu đề tối đa 200 ký tự' })
  @IsString({ message: 'Tiêu đề không được để trống' })
  @MinLength(1, { message: 'Tiêu đề không được để trống' })
  @Transform(trim)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(emptyToNull)
  summary?: string | null;

  @IsString({ message: 'Nội dung không được để trống' })
  @MinLength(1, { message: 'Nội dung không được để trống' })
  @Transform(trim)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(COVER_IMAGE, { message: COVER_IMAGE_MESSAGE })
  @Transform(emptyToNull)
  coverImage?: string | null;

  @MaxLength(120, { message: 'Tên tác giả tối đa 120 ký tự' })
  @IsString({ message: 'Tác giả không được để trống' })
  @MinLength(1, { message: 'Tác giả không được để trống' })
  @Transform(trim)
  author!: string;

  /**
   * Ngày xuất bản. Để trống mà trạng thái là `published` thì service lấy thời
   * điểm hiện tại — "đăng luôn" là ý định hiển nhiên khi không chọn ngày.
   */
  @IsOptional()
  @IsISO8601({}, { message: 'Ngày xuất bản không hợp lệ' })
  @Transform(emptyToNull)
  publishedAt?: string | null;

  @IsOptional()
  @IsIn(ARTICLE_STATUSES, {
    message: 'status chỉ nhận draft, published hoặc archived',
  })
  status?: ArticleStatus;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}

/** Sửa bài: mọi trường đều tuỳ chọn, không gửi thì giữ nguyên. */
export class UpdateArticleDto {
  @IsOptional()
  @IsInt()
  @IsPositive()
  categoryDetailId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @Transform(trim)
  slug?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Tiêu đề không được để trống' })
  @MaxLength(200)
  @Transform(trim)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(emptyToNull)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Nội dung không được để trống' })
  @Transform(trim)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(COVER_IMAGE, { message: COVER_IMAGE_MESSAGE })
  @Transform(emptyToNull)
  coverImage?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'Tác giả không được để trống' })
  @MaxLength(120)
  @Transform(trim)
  author?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Ngày xuất bản không hợp lệ' })
  @Transform(emptyToNull)
  publishedAt?: string | null;

  @IsOptional()
  @IsIn(ARTICLE_STATUSES, {
    message: 'status chỉ nhận draft, published hoặc archived',
  })
  status?: ArticleStatus;

  @IsOptional()
  @IsBoolean()
  featured?: boolean;
}
