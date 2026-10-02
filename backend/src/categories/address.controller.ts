import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { ApiKeyGuard } from '../common/api-key.guard';
import { AddressService, type AddressOption } from './address.service';

class ListWardsDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  provinceCode?: string;
}

/** Dữ liệu cho ô chọn địa chỉ ở form hồ sơ — không cần biết id danh mục. */
@Controller('address')
@UseGuards(ApiKeyGuard)
export class AddressController {
  constructor(private readonly address: AddressService) {}

  @Get('provinces')
  provinces(): { items: AddressOption[] } {
    return { items: this.address.listProvinces() };
  }

  @Get('wards')
  wards(@Query() query: ListWardsDto): { items: AddressOption[] } {
    if (!query.provinceCode) return { items: [] };
    return { items: this.address.listWards(query.provinceCode) };
  }
}
