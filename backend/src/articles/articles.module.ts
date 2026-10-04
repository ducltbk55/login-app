import { Module } from '@nestjs/common';

import { CategoriesModule } from '../categories/categories.module';
import { ArticleCategoriesService } from './article-categories.service';
import { ArticleImagesService } from './article-images.service';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';

@Module({
  imports: [CategoriesModule],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticleCategoriesService, ArticleImagesService],
  exports: [ArticlesService, ArticleCategoriesService],
})
export class ArticlesModule {}
