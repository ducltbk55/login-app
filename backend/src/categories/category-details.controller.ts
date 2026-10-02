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
  list(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Query() query: ListCategoryDetailsDto,
  ): Paginated<CategoryDetail> {
    return paginate(this.details.list(categoryId, query), query);
  }

  @Get(':id')
  findOne(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('id', ParseIntPipe) id: number,
  ): CategoryDetail {
    return this.details.findOneOrFail(categoryId, id);
  }

  @Post()
  create(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Body() dto: CreateCategoryDetailDto,
  ): CategoryDetail {
    return this.details.create(categoryId, dto);
  }

  @Patch(':id')
  update(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDetailDto,
  ): CategoryDetail {
    return this.details.update(categoryId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Param('id', ParseIntPipe) id: number,
  ): void {
    this.details.remove(categoryId, id);
  }
}
