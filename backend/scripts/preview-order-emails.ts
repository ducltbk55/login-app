/**
 * Xuất mọi mẫu email đơn hàng ra `data/email-previews/` để mở bằng trình duyệt.
 *
 *   npm run email:preview
 *   SITE_URL=https://uyvuict.vn npm run email:preview   # logo/QR lấy từ site thật
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { mailBrand } from '../src/mail/mail-brand';
import { sampleOrder } from '../src/mail/order-email.fixtures';
import {
  renderOrderEmail,
  type OrderEmailKind,
} from '../src/mail/order-email.templates';
import type { Order } from '../src/orders/order.entity';

const brand = mailBrand(process.env.SITE_URL ?? 'http://localhost:3000');
const outDir = join(__dirname, '..', 'data', 'email-previews');
mkdirSync(outDir, { recursive: true });

const cases: {
  kind: OrderEmailKind;
  order: Partial<Order>;
  note?: string;
}[] = [
  { kind: 'placed', order: {} },
  {
    kind: 'confirmed',
    order: { status: 'confirmed' },
    note: 'Kỹ thuật viên sẽ đến lắp đặt sáng thứ Năm, 08/10.',
  },
  {
    kind: 'shipping',
    order: { status: 'shipping', paymentMethod: 'cod' },
    note: 'Giao Hàng Nhanh — mã vận đơn GHN8812345. Dự kiến giao 07/10.',
  },
  {
    kind: 'completed',
    order: { status: 'completed', paymentStatus: 'paid' },
  },
  {
    kind: 'cancelled',
    order: { status: 'cancelled', paymentStatus: 'paid' },
    note: 'Mẫu camera này tạm hết hàng tại kho Đà Nẵng.',
  },
  {
    kind: 'payment_received',
    order: { status: 'confirmed', paymentStatus: 'paid' },
  },
  {
    kind: 'refunded',
    order: { status: 'cancelled', paymentStatus: 'refunded' },
    note: 'Đã chuyển về Vietcombank ****1234.',
  },
];

for (const { kind, order, note } of cases) {
  const email = renderOrderEmail(kind, sampleOrder(order), brand, { note });
  writeFileSync(join(outDir, `${kind}.html`), email.html);
  writeFileSync(
    join(outDir, `${kind}.txt`),
    `${email.subject}\n\n${email.text}`,
  );
  console.log(`✓ ${kind.padEnd(17)} ${email.subject}`);
}
console.log(`\nĐã ghi vào ${outDir}`);
