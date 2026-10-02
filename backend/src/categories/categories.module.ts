import { Module } from '@nestjs/common';

import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoryDetailsController } from './category-details.controller';
import { CategoryDetailsService } from './category-details.service';

@Module({
  controllers: [
    CategoriesController,
    CategoryDetailsController,
    AddressController,
  ],
  providers: [CategoriesService, CategoryDetailsService, AddressService],
  exports: [CategoriesService, CategoryDetailsService, AddressService],
})
export class CategoriesModule {}
