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
  list(@Query() query: ListCategoriesDto): Paginated<CategorySummary> {
    return paginate(this.categories.list(query), query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Category {
    return this.categories.findOneOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto): Category {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ): Category {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.categories.remove(id);
  }
}
