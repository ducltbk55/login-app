import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import {
  MAX_GALLERY_IMAGES,
  MAX_PRICE,
  MAX_SPEC_LABEL,
  MAX_SPEC_VALUE,
  MAX_SPECS,
  PRODUCT_STATUSES,
} from '../product.entity';
import type { ProductStatus } from '../product.entity';

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
  'slug chỉ gồm chữ thường, số và dấu gạch ngang ở giữa (vd: phan-mem-erp)';

/**
 * Ảnh sản phẩm: link http(s) bên ngoài, hoặc ảnh đã tải lên qua
 * /products/images (phát ở /media/products/<uuid>.<đuôi>). Chặn
 * `javascript:`, `data:`, đường dẫn tuỳ ý — giá trị này đi thẳng vào thẻ img.
 */
const IMAGE_PATTERN =
  /^(https?:\/\/[^\s"'<>]+|\/media\/products\/[0-9a-f-]{36}\.(jpg|png|gif|webp))$/;
const IMAGE_MESSAGE = 'Ảnh sản phẩm phải là link http(s) hoặc ảnh đã tải lên';

/** Một dòng thông số kỹ thuật. Trùng nhãn được kiểm tra ở service. */
export class ProductSpecDto {
  @MaxLength(MAX_SPEC_LABEL, {
    message: `Tên thông số tối đa ${MAX_SPEC_LABEL} ký tự`,
  })
  @IsString({ message: 'Tên thông số không được để trống' })
  @MinLength(1, { message: 'Tên thông số không được để trống' })
  @Transform(trim)
  label!: string;

  @MaxLength(MAX_SPEC_VALUE, {
    message: `Giá trị thông số tối đa ${MAX_SPEC_VALUE} ký tự`,
  })
  @IsString({ message: 'Giá trị thông số không được để trống' })
  @MinLength(1, { message: 'Giá trị thông số không được để trống' })
  @Transform(trim)
  value!: string;
}

const PRICE_MESSAGE = 'Giá phải là số nguyên VNĐ, không âm';
const STATUS_MESSAGE = 'status chỉ nhận draft, published hoặc archived';

/**
 * Thứ tự decorator có ý nghĩa (xem save-article.dto.ts): ràng buộc "không
 * được để trống" nằm sát tên trường để là thông báo đầu tiên được báo.
 *
 * Quy tắc giữa hai trường giá (khuyến mãi < niêm yết) nằm ở service, vì khi
 * sửa có thể chỉ gửi một trong hai.
 */
export class CreateProductDto {
  /** Chi tiết của danh mục `DM_LINH_VUC_SP`. */
  @IsInt({ message: 'Hãy chọn lĩnh vực cho sản phẩm' })
  categoryDetailId!: number;

  /** Bỏ trống thì tự sinh từ `name`. */
  @IsOptional()
  @IsString()
  @MaxLength(160)
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @Transform(trim)
  slug?: string;

  @MaxLength(200, { message: 'Tên sản phẩm tối đa 200 ký tự' })
  @IsString({ message: 'Tên sản phẩm không được để trống' })
  @MinLength(1, { message: 'Tên sản phẩm không được để trống' })
  @Transform(trim)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60, { message: 'Mã sản phẩm tối đa 60 ký tự' })
  @Transform(emptyToNull)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Tóm tắt tối đa 500 ký tự' })
  @Transform(emptyToNull)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @Transform(emptyToNull)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(IMAGE_PATTERN, { message: IMAGE_MESSAGE })
  @Transform(emptyToNull)
  image?: string | null;

  /** Bộ sưu tập ảnh, đúng thứ tự hiển thị. Gửi `[]` để xoá hết. */
  @IsOptional()
  @IsArray({ message: 'Bộ sưu tập ảnh phải là một danh sách' })
  @ArrayMaxSize(MAX_GALLERY_IMAGES, {
    message: `Bộ sưu tập tối đa ${MAX_GALLERY_IMAGES} ảnh`,
  })
  @IsString({ each: true })
  @Matches(IMAGE_PATTERN, { each: true, message: IMAGE_MESSAGE })
  gallery?: string[];

  /**
   * Link video giới thiệu. Kiểm tra định dạng (YouTube/Vimeo/file) ở service
   * bằng `parseVideoUrl` — cùng hàm frontend dùng để nhúng.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Link video tối đa 500 ký tự' })
  @Transform(emptyToNull)
  videoUrl?: string | null;

  /** Bảng thông số, đúng thứ tự hiển thị. Gửi `[]` để xoá hết. */
  @IsOptional()
  @IsArray({ message: 'Thông số kỹ thuật phải là một danh sách' })
  @ArrayMaxSize(MAX_SPECS, {
    message: `Tối đa ${MAX_SPECS} dòng thông số`,
  })
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];

  @IsOptional()
  @IsInt({ message: PRICE_MESSAGE })
  @Min(0, { message: PRICE_MESSAGE })
  @Max(MAX_PRICE, { message: 'Giá quá lớn' })
  price?: number | null;

  @IsOptional()
  @IsInt({ message: PRICE_MESSAGE })
  @Min(0, { message: PRICE_MESSAGE })
  @Max(MAX_PRICE, { message: 'Giá quá lớn' })
  salePrice?: number | null;

  @IsOptional()
  @IsISO8601({}, { message: 'Ngày ra mắt không hợp lệ' })
  @Transform(emptyToNull)
  launchedAt?: string | null;

  @IsOptional()
  @IsIn(PRODUCT_STATUSES, { message: STATUS_MESSAGE })
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;
}

/** Sửa sản phẩm: mọi trường đều tuỳ chọn, không gửi thì giữ nguyên. */
export class UpdateProductDto {
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
  @MinLength(1, { message: 'Tên sản phẩm không được để trống' })
  @MaxLength(200)
  @Transform(trim)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Transform(emptyToNull)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(emptyToNull)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @Transform(emptyToNull)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(IMAGE_PATTERN, { message: IMAGE_MESSAGE })
  @Transform(emptyToNull)
  image?: string | null;

  /** Bộ sưu tập ảnh, đúng thứ tự hiển thị. Gửi `[]` để xoá hết. */
  @IsOptional()
  @IsArray({ message: 'Bộ sưu tập ảnh phải là một danh sách' })
  @ArrayMaxSize(MAX_GALLERY_IMAGES, {
    message: `Bộ sưu tập tối đa ${MAX_GALLERY_IMAGES} ảnh`,
  })
  @IsString({ each: true })
  @Matches(IMAGE_PATTERN, { each: true, message: IMAGE_MESSAGE })
  gallery?: string[];

  /**
   * Link video giới thiệu. Kiểm tra định dạng (YouTube/Vimeo/file) ở service
   * bằng `parseVideoUrl` — cùng hàm frontend dùng để nhúng.
   */
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Link video tối đa 500 ký tự' })
  @Transform(emptyToNull)
  videoUrl?: string | null;

  /** Bảng thông số, đúng thứ tự hiển thị. Gửi `[]` để xoá hết. */
  @IsOptional()
  @IsArray({ message: 'Thông số kỹ thuật phải là một danh sách' })
  @ArrayMaxSize(MAX_SPECS, {
    message: `Tối đa ${MAX_SPECS} dòng thông số`,
  })
  @ValidateNested({ each: true })
  @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];

  @IsOptional()
  @IsInt({ message: PRICE_MESSAGE })
  @Min(0, { message: PRICE_MESSAGE })
  @Max(MAX_PRICE, { message: 'Giá quá lớn' })
  price?: number | null;

  @IsOptional()
  @IsInt({ message: PRICE_MESSAGE })
  @Min(0, { message: PRICE_MESSAGE })
  @Max(MAX_PRICE, { message: 'Giá quá lớn' })
  salePrice?: number | null;

  @IsOptional()
  @IsISO8601({}, { message: 'Ngày ra mắt không hợp lệ' })
  @Transform(emptyToNull)
  launchedAt?: string | null;

  @IsOptional()
  @IsIn(PRODUCT_STATUSES, { message: STATUS_MESSAGE })
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  inStock?: boolean;
}
