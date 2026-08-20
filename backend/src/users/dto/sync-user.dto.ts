import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class SyncUserDto {
  @IsEmail({}, { message: 'email không hợp lệ' })
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  image?: string | null;

  @IsIn(['google'], { message: 'provider hiện chỉ hỗ trợ "google"' })
  provider!: string;
}
