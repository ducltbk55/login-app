import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module';
import { DevLoginController } from './dev-login.controller';
import { DevLoginGuard } from './dev-login.guard';

@Module({
  imports: [UsersModule],
  controllers: [DevLoginController],
  providers: [DevLoginGuard],
})
export class DevLoginModule {}
