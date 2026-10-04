import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import { paginate, type Paginated } from '../common/pagination';
import { CategoryDetailsService } from './category-details.service';
import type { CategoryDetail } from './category.entity';
import { ListCategoryDetailsDto } from './dto/list-categories.dto';
import {
  CreateCategoryDetailDto,
  UpdateCategoryDetailDto,
} from './dto/save-category.dto';

/** Lồng dưới danh mục cha: mã chi tiết chỉ duy nhất trong phạm vi danh mục đó. */
@Controller('categories/:categoryId/details')
@UseGuards(ApiKeyGuard)
export class CategoryDetailsController {
  constructor(private readonly details: CategoryDetailsService) {}

  @Get()
  async list(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: ListCategoryDetailsDto,
  ): Promise<Paginated<CategoryDetail>> {
    return paginate(await this.details.list(categoryId, query), query);
  }

  @Get(':id')
  async findOne(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CategoryDetail> {
    return this.details.findOneOrFail(categoryId, id);
  }

  @Post()
  async create(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateCategoryDetailDto,
  ): Promise<CategoryDetail> {
    return this.details.create(categoryId, dto);
  }

  @Patch(':id')
  async update(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDetailDto,
  ): Promise<CategoryDetail> {
    return this.details.update(categoryId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.details.remove(categoryId, id);
  }
}
