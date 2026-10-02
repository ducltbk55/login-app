import { Module } from '@nestjs/common';

import { PermissionGroupsModule } from '../permission-groups/permission-groups.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PermissionGroupsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
