import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';
import { createValidationPipe } from './common/validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  // Mặc định Express chỉ nhận JSON 100KB — một bài dài có bảng biểu là vượt.
  // Ảnh không đi qua đây (upload riêng, lưu thành file) nên 2MB là dư.
  app.useBodyParser('json', { limit: '2mb' });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(createValidationPipe());
  app.enableCors({
    origin: config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
    credentials: true,
  });
  app.enableShutdownHooks();

  const port = Number(config.get('PORT') ?? 4000);
  await app.listen(port);
  new Logger('Bootstrap').log(
    `Backend đang chạy tại http://localhost:${port}/api`,
  );
}

void bootstrap();
