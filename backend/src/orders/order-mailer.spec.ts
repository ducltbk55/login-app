import { ConfigService } from '@nestjs/config';

import { sampleOrder } from '../mail/order-email.fixtures';
import { MailService } from '../mail/mail.service';
import { OrderMailer } from './order-mailer';

describe('OrderMailer', () => {
  const config = new ConfigService({
    FRONTEND_ORIGIN: 'https://uyvuict.vn',
  });
  let send: jest.Mock;
  let mailer: OrderMailer;

  beforeEach(() => {
    send = jest.fn().mockResolvedValue(true);
    mailer = new OrderMailer({ send } as unknown as MailService, config);
  });

  it('gửi email "đã nhận đơn" tới email khách nhập', async () => {
    await mailer.notify(sampleOrder({ customerEmail: 'khach@x.vn' }), {
      type: 'created',
    });
    expect(send).toHaveBeenCalledTimes(1);
    const [message] = send.mock.calls[0] as [
      { to: string; subject: string; html: string },
    ];
    expect(message.to).toBe('khach@x.vn');
    expect(message.subject).toContain('Đã nhận đơn hàng');
    expect(message.html).toContain('https://uyvuict.vn/logo-uy-vu-ict.png');
  });

  it('không có email khách thì dùng email tài khoản', async () => {
    await mailer.notify(
      sampleOrder({ customerEmail: null, userEmail: 'tk@x.vn' }),
      { type: 'status', to: 'shipping' },
    );
    expect((send.mock.calls[0] as [{ to: string }])[0].to).toBe('tk@x.vn');
  });

  it('bỏ qua khi không có email nào, hoặc thay đổi không cần báo khách', async () => {
    await mailer.notify(sampleOrder({ customerEmail: null, userEmail: null }), {
      type: 'created',
    });
    await mailer.notify(sampleOrder(), { type: 'payment', to: 'unpaid' });
    expect(send).not.toHaveBeenCalled();
  });

  it('ghi chú của admin đi kèm email', async () => {
    await mailer.notify(
      sampleOrder({ status: 'cancelled' }),
      { type: 'status', to: 'cancelled' },
      'Hết hàng',
    );
    expect((send.mock.calls[0] as [{ text: string }])[0].text).toContain(
      'Lý do huỷ: Hết hàng',
    );
  });
});

describe('MailService', () => {
  it('thiếu SMTP_HOST thì tắt, send trả false chứ không ném lỗi', async () => {
    const mail = new MailService(new ConfigService({}));
    expect(mail.enabled).toBe(false);
    await expect(
      mail.send({ to: 'a@b.c', subject: 's', html: '', text: '' }),
    ).resolves.toBe(false);
  });

  it('SMTP lỗi thì trả false chứ không ném lỗi', async () => {
    // Cổng 1 trên localhost: kết nối bị từ chối ngay.
    const mail = new MailService(
      new ConfigService({ SMTP_HOST: '127.0.0.1', SMTP_PORT: '1' }),
    );
    expect(mail.enabled).toBe(true);
    await expect(
      mail.send({ to: 'a@b.c', subject: 's', html: '', text: '' }),
    ).resolves.toBe(false);
  });
});
