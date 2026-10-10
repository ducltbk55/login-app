import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { mailBrand, type MailBrand } from '../mail/mail-brand';
import { MailService } from '../mail/mail.service';
import {
  orderEmailKindFor,
  renderOrderEmail,
} from '../mail/order-email.templates';
import type { Order, OrderStatus, PaymentStatus } from './order.entity';

export type OrderChange =
  | { type: 'created' }
  | { type: 'status'; to: OrderStatus }
  | { type: 'payment'; to: PaymentStatus };

/** Chọn mẫu, dựng nội dung và gửi email đơn hàng cho khách. */
@Injectable()
export class OrderMailer {
  private readonly brand: MailBrand;

  constructor(
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    // Logo, QR và link trong email trỏ về website công khai.
    this.brand = mailBrand(
      config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
    );
  }

  /**
   * Không bao giờ ném lỗi (MailService đã nuốt lỗi SMTP) — gọi sau khi
   * transaction đã commit, không cần `await`.
   */
  async notify(
    order: Order,
    change: OrderChange,
    note?: string | null,
  ): Promise<void> {
    // Email nhập lúc đặt; không có thì dùng email tài khoản đăng nhập.
    const to = order.customerEmail ?? order.userEmail;
    const kind = orderEmailKindFor(change);
    if (!to || !kind) return;

    const email = renderOrderEmail(kind, order, this.brand, { note });
    await this.mail.send({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
  }
}
