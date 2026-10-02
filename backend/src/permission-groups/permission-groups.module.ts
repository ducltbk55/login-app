import { Module } from '@nestjs/common';

import { CategoriesModule } from '../categories/categories.module';
import { PermissionCatalogService } from './permission-catalog.service';
import { PermissionGroupsController } from './permission-groups.controller';
import { PermissionGroupsService } from './permission-groups.service';

@Module({
  // Danh mục quyền là một danh mục bình thường nên cần CategoriesModule.
  imports: [CategoriesModule],
  controllers: [PermissionGroupsController],
  providers: [PermissionGroupsService, PermissionCatalogService],
  exports: [PermissionGroupsService, PermissionCatalogService],
})
export class PermissionGroupsModule {}
