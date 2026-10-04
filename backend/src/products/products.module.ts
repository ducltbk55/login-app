import { Module } from '@nestjs/common';

import { CategoriesModule } from '../categories/categories.module';
import { ProductCategoriesService } from './product-categories.service';
import { ProductImagesService } from './product-images.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [CategoriesModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductCategoriesService, ProductImagesService],
  exports: [ProductsService],
})
export class ProductsModule {}
