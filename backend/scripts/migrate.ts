/**
 * Tạo bảng và chạy migration dữ liệu còn thiếu rồi thoát, không bật server.
 *
 *   npm run migrate
 *
 * Dùng trong bước deploy (trước khi khởi động bản mới). Backend cũng tự chạy
 * đúng việc này mỗi lần khởi động, nên quên bước này cũng không sao — tách
 * riêng chỉ để lỗi migration lộ ra ở bước deploy thay vì lúc server đang lên.
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { DatabaseModule } from '../src/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
  ],
})
class MigrateModule {}

async function main(): Promise<void> {
  // Khởi tạo DatabaseModule là chạy schema + migration (DatabaseService.onModuleInit).
  const app = await NestFactory.createApplicationContext(MigrateModule, {
    logger: ['log', 'warn', 'error'],
  });
  await app.close();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
