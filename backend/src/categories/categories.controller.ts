import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import type { Category } from './category.entity';
import { CategoriesService } from './categories.service';
import { ListCategoriesDto } from './dto/list-categories.dto';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/save-category.dto';

@Controller('categories')
@UseGuards(ApiKeyGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list(@Query() query: ListCategoriesDto): {
    total: number;
    items: Category[];
  } {
    const items = this.categories.list(query);
    return { total: items.length, items };
  }

  @Get(':id')
  findOne(@Param('id') id: string): Category {
    return this.categories.findOneOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto): Category {
    return this.categories.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto): Category {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string): void {
    this.categories.remove(id);
  }
}
