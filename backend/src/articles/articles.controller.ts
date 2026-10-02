import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import { paginate, type Paginated } from '../common/pagination';
import type { Article } from './article.entity';
import { ArticleCategoriesService } from './article-categories.service';
import { ArticlesService } from './articles.service';
import { ListArticlesDto } from './dto/list-articles.dto';
import { CreateArticleDto, UpdateArticleDto } from './dto/save-article.dto';

@Controller('articles')
@UseGuards(ApiKeyGuard)
export class ArticlesController {
  constructor(
    private readonly articles: ArticlesService,
    private readonly categories: ArticleCategoriesService,
  ) {}

  @Get()
  list(@Query() query: ListArticlesDto): Paginated<Article> {
    return paginate(this.articles.list(query), query);
  }

  /**
   * Chuyên mục đang bật, kèm số bài. Có endpoint riêng để frontend khỏi phải
   * biết mã DM_CHUYEN_MUC rồi gọi hai vòng (tìm danh mục → lấy chi tiết).
   */
  @Get('categories')
  listCategories(@Query('live') live?: string): {
    id: number;
    code: string;
    name: string;
    articleCount: number;
  }[] {
    const counts = this.articles.countsByCategory(
      live === 'true' || live === '1',
    );
    return this.categories.list().map((detail) => ({
      id: detail.id,
      code: detail.code,
      name: detail.name,
      articleCount: counts[detail.id] ?? 0,
    }));
  }

  /** Số bài theo chuyên mục, cho bộ lọc ở trang Tin tức. */
  @Get('counts')
  counts(@Query('live') live?: string): Record<number, number> {
    return this.articles.countsByCategory(live === 'true' || live === '1');
  }

  /**
   * Đặt trước `:id` vì Nest khớp route theo thứ tự khai báo — để sau thì
   * `/articles/slug/...` sẽ rơi vào `:id` và hỏng ở ParseIntPipe.
   */
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string): Article {
    const article = this.articles.findBySlug(slug);
    if (!article) {
      throw new NotFoundException(`Không tìm thấy bài viết "${slug}"`);
    }
    return article;
  }

  @Post('slug/:slug/views')
  @HttpCode(204)
  recordView(@Param('slug') slug: string): void {
    this.articles.recordView(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Article {
    return this.articles.findOneOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateArticleDto): Article {
    return this.articles.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
  ): Article {
    return this.articles.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.articles.remove(id);
  }
}
