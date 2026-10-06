import type { Order } from '../orders/order.entity';

/** Đơn mẫu cho test và script xem trước email. */
export function sampleOrder(overrides: Partial<Order> = {}): Order {
  const items: Order['items'] = [
    {
      id: 1,
      productId: 10,
      productName: 'Camera IP Wi-Fi 4MP ngoài trời',
      productSlug: 'camera-ip-wifi-4mp',
      sku: 'CAM-4MP-OUT',
      image: null,
      listPrice: 1_490_000,
      unitPrice: 1_190_000,
      quantity: 2,
      lineTotal: 2_380_000,
    },
    {
      id: 2,
      productId: 11,
      productName: 'Lắp đặt & cấu hình hệ thống camera',
      productSlug: null,
      sku: null,
      image: null,
      listPrice: 500_000,
      unitPrice: 500_000,
      quantity: 1,
      lineTotal: 500_000,
    },
  ];
  return {
    id: 1,
    code: 'DH261006-0007',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0905 123 456',
    customerEmail: 'an@example.com',
    address: '12 Lê Duẩn, Phường Hải Châu, Thành phố Đà Nẵng',
    note: 'Gọi trước 30 phút giúp em.',
    userEmail: 'an@example.com',
    paymentMethod: 'bank_transfer',
    paymentStatus: 'unpaid',
    status: 'pending',
    subtotal: 3_480_000,
    discount: 600_000,
    total: 2_880_000,
    itemCount: 3,
    adminNote: 'KHÁCH VIP — ghi chú nội bộ',
    createdAt: '2026-10-06T07:30:00.000Z',
    updatedAt: '2026-10-06T07:30:00.000Z',
    items,
    ...overrides,
  };
}
