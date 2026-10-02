import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ArticlesModule } from './articles/articles.module';
import { CategoriesModule } from './categories/categories.module';
import { ContactsModule } from './contacts/contacts.module';
import { DatabaseModule } from './database/database.module';
import { DevLoginModule } from './dev-login/dev-login.module';
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
    ArticlesModule,
    ContactsModule,
    HealthModule,
    DevLoginModule,
  ],
})
export class AppModule {}
