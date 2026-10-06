import { Module } from '@nestjs/common';

import { MailModule } from '../mail/mail.module';
import { OrderMailer } from './order-mailer';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [MailModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderMailer],
  exports: [OrdersService],
})
export class OrdersModule {}
