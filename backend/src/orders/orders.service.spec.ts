import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesModule } from '../categories/categories.module';
import { CategoryDetailsService } from '../categories/category-details.service';
import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { ProductCategoriesService } from '../products/product-categories.service';
import { MailService } from '../mail/mail.service';
import { ProductsService } from '../products/products.service';
import { OrderMailer } from './order-mailer';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let moduleRef: TestingModule;
  let orders: OrdersService;
  let products: ProductsService;

  /** Sản phẩm mẫu: giá 10tr giảm còn 8tr, giá 3tr, chưa có giá, hết hàng, nháp. */
  let sale: number;
  let plain: number;
  let noPrice: number;
  let outOfStock: number;
  let draft: number;

  const customer = {
    customerName: 'Nguyễn Văn A',
    customerPhone: '0905 123 456',
    paymentMethod: 'cod' as const,
  };
  const order = (
    items: { productId: number; quantity: number }[],
    extra = {},
  ) => orders.create({ ...customer, ...extra, items });

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => testDatabaseConfig()],
        }),
        DatabaseModule,
        CategoriesModule,
      ],
      // Không có SMTP_HOST nên MailService ở chế độ tắt — không gửi thật.
      providers: [
        OrdersService,
        OrderMailer,
        MailService,
        ProductsService,
        ProductCategoriesService,
      ],
    }).compile();

    await moduleRef.init();
    orders = moduleRef.get(OrdersService);
    products = moduleRef.get(ProductsService);

    const category = await moduleRef
      .get(ProductCategoriesService)
      .ensureCategory();
    const categoryDetailId = (
      await moduleRef
        .get(CategoryDetailsService)
        .create(category.id, { code: 'PM', name: 'Phần mềm' })
    ).id;

    const make = async (name: string, extra: Record<string, unknown>) =>
      (
        await products.create({
          categoryDetailId,
          name,
          status: 'published',
          ...extra,
        })
      ).id;

    sale = await make('Có khuyến mãi', {
      price: 10_000_000,
      salePrice: 8_000_000,
      sku: 'KM-1',
    });
    plain = await make('Giá thường', { price: 3_000_000 });
    noPrice = await make('Chưa có giá', {});
    outOfStock = await make('Hết hàng', { price: 1_000_000, inStock: false });
    draft = await make('Bản nháp', { price: 1_000_000, status: 'draft' });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('đặt hàng', () => {
    it('tính tiền ở server, chụp lại tên/giá, trạng thái ban đầu', async () => {
      const created = await order([
        { productId: sale, quantity: 2 },
        { productId: plain, quantity: 1 },
      ]);

      expect(created).toMatchObject({
        status: 'pending',
        paymentStatus: 'unpaid',
        subtotal: 23_000_000,
        discount: 4_000_000,
        total: 19_000_000,
        itemCount: 3,
      });
      expect(created.code).toMatch(/^DH\d{6}-0001$/);
      expect(created.items[0]).toMatchObject({
        productName: 'Có khuyến mãi',
        sku: 'KM-1',
        listPrice: 10_000_000,
        unitPrice: 8_000_000,
        quantity: 2,
        lineTotal: 16_000_000,
      });
      expect(created.events).toEqual([
        expect.objectContaining({ type: 'created', toValue: 'pending' }),
      ]);
    });

    it('mã đơn tăng dần trong ngày', async () => {
      const first = await order([{ productId: plain, quantity: 1 }]);
      const second = await order([{ productId: plain, quantity: 1 }]);
      expect(second.code.slice(-4)).toBe('0002');
      expect(second.code.slice(0, -4)).toBe(first.code.slice(0, -4));
    });

    it('gộp dòng trùng sản phẩm', async () => {
      const created = await order([
        { productId: plain, quantity: 1 },
        { productId: plain, quantity: 2 },
      ]);
      expect(created.items).toHaveLength(1);
      expect(created.items[0].quantity).toBe(3);
    });

    it.each([
      ['hết hàng', () => outOfStock, 'tạm hết hàng'],
      ['chưa có giá', () => noPrice, 'chưa có giá'],
      ['bản nháp', () => draft, 'ngừng bán'],
      ['không tồn tại', () => 999_999, 'ngừng bán'],
    ])(
      'chặn sản phẩm %s, không tạo đơn dở dang',
      async (_label, id, message) => {
        await expect(
          order([
            { productId: plain, quantity: 1 },
            { productId: id(), quantity: 1 },
          ]),
        ).rejects.toThrow(message);
        expect(await orders.list()).toEqual([]);
      },
    );

    it('giá đổi sau khi đặt không ảnh hưởng đơn cũ; xoá sản phẩm không mất đơn', async () => {
      const created = await order([{ productId: plain, quantity: 1 }]);
      await products.update(plain, { price: 9_000_000, name: 'Tên mới' });
      await products.remove(plain);

      const again = await orders.findOneOrFail(created.id);
      expect(again.total).toBe(3_000_000);
      expect(again.items[0]).toMatchObject({
        productId: null,
        productName: 'Giá thường',
        unitPrice: 3_000_000,
      });
    });
  });

  describe('xử lý đơn', () => {
    it('đi đúng luồng và ghi lịch sử kèm người thực hiện', async () => {
      const { id } = await order([{ productId: plain, quantity: 1 }]);
      await orders.updateStatus(id, { status: 'confirmed', actor: 'Admin' });
      await orders.updateStatus(id, { status: 'shipping', actor: 'Admin' });
      const done = await orders.updateStatus(id, {
        status: 'completed',
        actor: 'Admin',
      });

      expect(done.status).toBe('completed');
      expect(done.events.map((e) => [e.type, e.fromValue, e.toValue])).toEqual([
        ['created', null, 'pending'],
        ['status', 'pending', 'confirmed'],
        ['status', 'confirmed', 'shipping'],
        ['status', 'shipping', 'completed'],
      ]);
      expect(done.events[1].actor).toBe('Admin');
    });

    it('chặn bước nhảy sai và mở lại đơn đã xong', async () => {
      const { id } = await order([{ productId: plain, quantity: 1 }]);
      await expect(
        orders.updateStatus(id, { status: 'shipping' }),
      ).rejects.toThrow('Không chuyển được');
      await orders.updateStatus(id, { status: 'confirmed' });
      await orders.updateStatus(id, { status: 'completed' });
      await expect(
        orders.updateStatus(id, { status: 'pending' }),
      ).rejects.toThrow();
      await expect(
        orders.updateStatus(id, { status: 'cancelled', note: 'x' }),
      ).rejects.toThrow();
    });

    it('huỷ đơn bắt buộc ghi lý do', async () => {
      const { id } = await order([{ productId: plain, quantity: 1 }]);
      await expect(
        orders.updateStatus(id, { status: 'cancelled' }),
      ).rejects.toThrow('lý do');
      expect(
        (
          await orders.updateStatus(id, {
            status: 'cancelled',
            note: 'Khách đổi ý',
          })
        ).status,
      ).toBe('cancelled');
    });

    it('thanh toán: thu → hoàn tiền, không hoàn khi chưa thu', async () => {
      const { id } = await order([{ productId: plain, quantity: 1 }]);
      await expect(
        orders.updatePayment(id, { paymentStatus: 'refunded' }),
      ).rejects.toThrow();
      await orders.updatePayment(id, { paymentStatus: 'paid' });
      expect(
        (await orders.updatePayment(id, { paymentStatus: 'refunded' }))
          .paymentStatus,
      ).toBe('refunded');
    });

    it('ghi chú nội bộ lưu kèm một dòng lịch sử', async () => {
      const { id } = await order([{ productId: plain, quantity: 1 }]);
      const updated = await orders.updateAdminNote(id, {
        adminNote: 'Gọi lại sau 3h',
        actor: 'Admin',
      });
      expect(updated.adminNote).toBe('Gọi lại sau 3h');
      expect(updated.events.at(-1)).toMatchObject({
        type: 'note',
        note: 'Gọi lại sau 3h',
      });
    });
  });

  it('lọc theo tìm kiếm, trạng thái, tài khoản; thống kê doanh thu', async () => {
    const a = await order([{ productId: plain, quantity: 1 }], {
      userEmail: 'khach@vd.vn',
    });
    await order([{ productId: sale, quantity: 1 }], {
      customerName: 'Trần Thị Bé',
    });
    await orders.updateStatus(a.id, { status: 'confirmed' });
    await orders.updateStatus(a.id, { status: 'completed' });

    expect(
      (await orders.list({ search: 'tran thi' })).map((o) => o.customerName),
    ).toEqual(['Trần Thị Bé']);
    expect(await orders.list({ search: '0905123' })).toHaveLength(2);
    expect(await orders.list({ search: '0905 123' })).toHaveLength(2);
    expect(
      (await orders.list({ status: 'completed' })).map((o) => o.id),
    ).toEqual([a.id]);
    expect(
      (await orders.list({ userEmail: 'KHACH@vd.vn' })).map((o) => o.id),
    ).toEqual([a.id]);

    expect(await orders.stats()).toMatchObject({
      total: 2,
      revenue: 3_000_000,
      today: 2,
      byStatus: { pending: 1, completed: 1 },
    });
  });
});
