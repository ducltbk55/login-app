import { mailBrand } from './mail-brand';
import { sampleOrder } from './order-email.fixtures';
import {
  ORDER_EMAIL_KINDS,
  orderEmailKindFor,
  renderOrderEmail,
} from './order-email.templates';

const brand = mailBrand('https://uyvuict.vn/');

describe('renderOrderEmail', () => {
  it.each(ORDER_EMAIL_KINDS)('"%s" có tiêu đề, HTML và bản chữ', (kind) => {
    const email = renderOrderEmail(kind, sampleOrder(), brand);
    expect(email.subject).toMatch(/^\[UY VŨ ICT\] .*DH261006-0007/);
    expect(email.html).toContain('<!DOCTYPE html>');
    expect(email.html).toContain('DH261006-0007');
    expect(email.text).toContain('TỔNG CỘNG');
    expect(email.preheader).not.toMatch(/<|&amp;/);
  });

  it('escape dữ liệu khách nhập', () => {
    const email = renderOrderEmail(
      'placed',
      sampleOrder({ customerName: '<script>x</script>', note: 'a & "b"' }),
      brand,
      { note: '<img onerror=1>' },
    );
    expect(email.html).not.toContain('<script>x');
    expect(email.html).not.toContain('<img onerror');
    expect(email.html).toContain('&lt;script&gt;');
    // Bản chữ thuần thì giữ nguyên ký tự gốc.
    expect(email.text).toContain('<script>x</script>');
    expect(email.preheader).toContain('<script>x</script>');
  });

  it('không bao giờ lộ ghi chú nội bộ của admin', () => {
    for (const kind of ORDER_EMAIL_KINDS) {
      const email = renderOrderEmail(kind, sampleOrder(), brand);
      expect(email.html).not.toContain('KHÁCH VIP');
      expect(email.text).not.toContain('KHÁCH VIP');
    }
  });

  it('hiện thông tin chuyển khoản khi đơn chuyển khoản chưa thanh toán', () => {
    const email = renderOrderEmail('placed', sampleOrder(), brand);
    expect(email.html).toContain('Thông tin chuyển khoản');
    expect(email.html).toContain('https://uyvuict.vn/bank-qr.png');
    expect(email.text).toContain('Số tài khoản:  7992456789');
  });

  it('không hiện chuyển khoản với COD, đơn đã trả hoặc đã huỷ', () => {
    const cases = [
      sampleOrder({ paymentMethod: 'cod' }),
      sampleOrder({ paymentStatus: 'paid' }),
      sampleOrder({ status: 'cancelled' }),
    ];
    for (const order of cases) {
      const kind = order.status === 'cancelled' ? 'cancelled' : 'confirmed';
      expect(renderOrderEmail(kind, order, brand).html).not.toContain(
        'Thông tin chuyển khoản',
      );
    }
  });

  it('nhắc số tiền COD khi đang giao', () => {
    const email = renderOrderEmail(
      'shipping',
      sampleOrder({ paymentMethod: 'cod', status: 'shipping' }),
      brand,
    );
    expect(email.text).toContain('Số tiền cần thanh toán khi nhận');
  });

  it('đơn huỷ đã trả tiền thì báo sẽ hoàn', () => {
    const email = renderOrderEmail(
      'cancelled',
      sampleOrder({ status: 'cancelled', paymentStatus: 'paid' }),
      brand,
      { note: 'Hết hàng' },
    );
    expect(email.text).toContain('sẽ được hoàn lại');
    expect(email.text).toContain('Lý do huỷ: Hết hàng');
  });

  it('khách vãng lai được mời liên hệ thay vì xem đơn', () => {
    const email = renderOrderEmail(
      'placed',
      sampleOrder({ userEmail: null }),
      brand,
    );
    expect(email.html).toContain('https://uyvuict.vn/lien-he');
    expect(email.html).not.toContain('/dashboard');
  });
});

describe('orderEmailKindFor', () => {
  it('ánh xạ thay đổi sang loại email', () => {
    expect(orderEmailKindFor({ type: 'created' })).toBe('placed');
    expect(orderEmailKindFor({ type: 'status', to: 'shipping' })).toBe(
      'shipping',
    );
    expect(orderEmailKindFor({ type: 'status', to: 'pending' })).toBeNull();
    expect(orderEmailKindFor({ type: 'payment', to: 'paid' })).toBe(
      'payment_received',
    );
    expect(orderEmailKindFor({ type: 'payment', to: 'refunded' })).toBe(
      'refunded',
    );
    expect(orderEmailKindFor({ type: 'payment', to: 'unpaid' })).toBeNull();
  });
});
