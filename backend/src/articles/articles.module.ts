import { Module } from '@nestjs/common';

import { CategoriesModule } from '../categories/categories.module';
import { ArticleCategoriesService } from './article-categories.service';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [CategoriesModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticleCategoriesService],
  exports: [ArticlesService, ArticleCategoriesService],
})
export class ArticlesModule {}
