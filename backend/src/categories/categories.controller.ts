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
import { CategoriesService } from './categories.service';
import type { Category, CategorySummary } from './category.entity';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/save-category.dto';

@Controller('categories')
@UseGuards(ApiKeyGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  async list(
    @Query() query: ListCategoriesDto,
  ): Promise<Paginated<CategorySummary>> {
    return paginate(await this.categories.list(query), query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Category> {
    return this.categories.findOneOrFail(id);
  }

  @Post()
  async create(@Body() dto: CreateCategoryDto): Promise<Category> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.categories.remove(id);
  }
}
