import { Module } from '@nestjs/common';

import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryDetailsController } from './category-details.controller';
import { CategoryDetailsService } from './category-details.service';

@Module({
  controllers: [CategoriesController, CategoryDetailsController],
  providers: [CategoriesService, CategoryDetailsService],
  exports: [CategoriesService, CategoryDetailsService],
})
export class CategoriesModule {}
