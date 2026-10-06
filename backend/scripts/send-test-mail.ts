/**
 * Kiểm tra cấu hình SMTP: đăng nhập máy chủ rồi gửi một email "Đã nhận đơn"
 * mẫu tới địa chỉ chỉ định. Đọc biến từ `.env.local` / `.env` như backend.
 *
 *   npm run mail:test -- ban@gmail.com
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { mailBrand } from '../src/mail/mail-brand';
import { MailModule } from '../src/mail/mail.module';
import { MailService } from '../src/mail/mail.service';
import { sampleOrder } from '../src/mail/order-email.fixtures';
import { renderOrderEmail } from '../src/mail/order-email.templates';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    MailModule,
  ],
})
class MailTestModule {}

async function main() {
  const to = process.argv[2];
  if (!to)
    throw new Error('Thiếu địa chỉ nhận: npm run mail:test -- ban@gmail.com');

  const app = await NestFactory.createApplicationContext(MailTestModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const mail = app.get(MailService);
    await mail.verify();
    console.log('✓ Đăng nhập SMTP thành công');

    const brand = mailBrand(
      app.get(ConfigService).get<string>('FRONTEND_ORIGIN') ??
        'http://localhost:3000',
    );
    const email = renderOrderEmail('placed', sampleOrder(), brand);
    const sent = await mail.send({
      to,
      subject: `[THỬ] ${email.subject}`,
      html: email.html,
      text: email.text,
    });
    if (!sent) process.exitCode = 1;
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(`✗ ${error.message}`);
  process.exit(1);
});
