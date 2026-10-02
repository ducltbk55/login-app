import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CategoriesModule } from './categories/categories.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { PermissionGroupsModule } from './permission-groups/permission-groups.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    UsersModule,
    PermissionGroupsModule,
    CategoriesModule,
    HealthModule,
  ],
})
export class AppModule {}
