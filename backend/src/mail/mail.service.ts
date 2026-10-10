import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/**
 * Gửi email qua SMTP. Cấu hình bằng biến môi trường `SMTP_*` / `MAIL_*`
 * (xem `backend/.env.example`).
 *
 * Thiếu `SMTP_HOST` thì TẮT: chỉ ghi log, không gửi — máy dev không cần SMTP
 * vẫn đặt hàng bình thường.
 *
 * `send` không bao giờ ném lỗi: SMTP chậm hay sập thì đơn hàng vẫn phải lưu
 * được; lỗi chỉ ghi log để admin xem.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly replyTo: string | undefined;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST')?.trim();
    const port = Number(config.get<string>('SMTP_PORT') || 587);
    const user = config.get<string>('SMTP_USER')?.trim();
    // 465 = SSL ngay từ đầu; 587/25 = STARTTLS (nodemailer tự nâng cấp).
    // Docker truyền biến trống thành "", nên trống cũng tính là chưa đặt.
    const secureEnv = config.get<string>('SMTP_SECURE')?.trim();
    const secure = secureEnv ? secureEnv === 'true' : port === 465;

    this.from =
      config.get<string>('MAIL_FROM')?.trim() || user || 'no-reply@localhost';
    this.replyTo = config.get<string>('MAIL_REPLY_TO')?.trim() || undefined;

    this.transporter = host
      ? createTransport({
          host,
          port,
          secure,
          auth: user
            ? { user, pass: config.get<string>('SMTP_PASSWORD') ?? '' }
            : undefined,
        })
      : null;

    if (!this.transporter) {
      this.logger.log('SMTP_HOST trống — email bị tắt, chỉ ghi log');
    }
  }

  get enabled(): boolean {
    return this.transporter !== null;
  }

  /** Kiểm tra đăng nhập SMTP — dùng cho script `mail:test`. */
  async verify(): Promise<void> {
    if (!this.transporter) throw new Error('Chưa cấu hình SMTP_HOST');
    await this.transporter.verify();
  }

  /** `true` nếu máy chủ SMTP đã nhận thư. */
  async send(message: MailMessage): Promise<boolean> {
    if (!this.transporter) {
      this.logger.log(`[tắt] ${message.to} — ${message.subject}`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        replyTo: this.replyTo,
        ...message,
      });
      this.logger.log(`Đã gửi ${message.to} — ${message.subject}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Gửi thất bại ${message.to} — ${message.subject}: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
