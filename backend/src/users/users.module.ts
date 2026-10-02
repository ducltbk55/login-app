import { Module } from '@nestjs/common';

import { CategoriesModule } from '../categories/categories.module';
import { PermissionGroupsModule } from '../permission-groups/permission-groups.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  // CategoriesModule cho AddressService: hồ sơ người dùng có tỉnh/phường.
  imports: [PermissionGroupsModule, CategoriesModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
