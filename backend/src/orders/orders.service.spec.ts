import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CategoriesModule } from '../categories/categories.module';
import { CategoryDetailsService } from '../categories/category-details.service';
import { DatabaseModule } from '../database/database.module';
import { ProductCategoriesService } from '../products/product-categories.service';
import { ProductsService } from '../products/products.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let moduleRef: TestingModule;
  let tempDir: string;
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
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-orders-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
        }),
        DatabaseModule,
        CategoriesModule,
      ],
      providers: [OrdersService, ProductsService, ProductCategoriesService],
    }).compile();

    await moduleRef.init();
    orders = moduleRef.get(OrdersService);
    products = moduleRef.get(ProductsService);

    const category = moduleRef.get(ProductCategoriesService).ensureCategory();
    const categoryDetailId = moduleRef
      .get(CategoryDetailsService)
      .create(category.id, { code: 'PM', name: 'Phần mềm' }).id;

    const make = (name: string, extra: Record<string, unknown>) =>
      products.create({ categoryDetailId, name, status: 'published', ...extra })
        .id;

    sale = make('Có khuyến mãi', {
      price: 10_000_000,
      salePrice: 8_000_000,
      sku: 'KM-1',
    });
    plain = make('Giá thường', { price: 3_000_000 });
    noPrice = make('Chưa có giá', {});
    outOfStock = make('Hết hàng', { price: 1_000_000, inStock: false });
    draft = make('Bản nháp', { price: 1_000_000, status: 'draft' });
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('đặt hàng', () => {
    it('tính tiền ở server, chụp lại tên/giá, trạng thái ban đầu', () => {
      const created = order([
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

    it('mã đơn tăng dần trong ngày', () => {
      const first = order([{ productId: plain, quantity: 1 }]);
      const second = order([{ productId: plain, quantity: 1 }]);
      expect(second.code.slice(-4)).toBe('0002');
      expect(second.code.slice(0, -4)).toBe(first.code.slice(0, -4));
    });

    it('gộp dòng trùng sản phẩm', () => {
      const created = order([
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
    ])('chặn sản phẩm %s, không tạo đơn dở dang', (_label, id, message) => {
      expect(() =>
        order([
          { productId: plain, quantity: 1 },
          { productId: id(), quantity: 1 },
        ]),
      ).toThrow(message);
      expect(orders.list()).toEqual([]);
    });

    it('giá đổi sau khi đặt không ảnh hưởng đơn cũ; xoá sản phẩm không mất đơn', () => {
      const created = order([{ productId: plain, quantity: 1 }]);
      products.update(plain, { price: 9_000_000, name: 'Tên mới' });
      products.remove(plain);

      const again = orders.findOneOrFail(created.id);
      expect(again.total).toBe(3_000_000);
      expect(again.items[0]).toMatchObject({
        productId: null,
        productName: 'Giá thường',
        unitPrice: 3_000_000,
      });
    });
  });

  describe('xử lý đơn', () => {
    it('đi đúng luồng và ghi lịch sử kèm người thực hiện', () => {
      const { id } = order([{ productId: plain, quantity: 1 }]);
      orders.updateStatus(id, { status: 'confirmed', actor: 'Admin' });
      orders.updateStatus(id, { status: 'shipping', actor: 'Admin' });
      const done = orders.updateStatus(id, {
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

    it('chặn bước nhảy sai và mở lại đơn đã xong', () => {
      const { id } = order([{ productId: plain, quantity: 1 }]);
      expect(() => orders.updateStatus(id, { status: 'shipping' })).toThrow(
        'Không chuyển được',
      );
      orders.updateStatus(id, { status: 'confirmed' });
      orders.updateStatus(id, { status: 'completed' });
      expect(() => orders.updateStatus(id, { status: 'pending' })).toThrow();
      expect(() =>
        orders.updateStatus(id, { status: 'cancelled', note: 'x' }),
      ).toThrow();
    });

    it('huỷ đơn bắt buộc ghi lý do', () => {
      const { id } = order([{ productId: plain, quantity: 1 }]);
      expect(() => orders.updateStatus(id, { status: 'cancelled' })).toThrow(
        'lý do',
      );
      expect(
        orders.updateStatus(id, { status: 'cancelled', note: 'Khách đổi ý' })
          .status,
      ).toBe('cancelled');
    });

    it('thanh toán: thu → hoàn tiền, không hoàn khi chưa thu', () => {
      const { id } = order([{ productId: plain, quantity: 1 }]);
      expect(() =>
        orders.updatePayment(id, { paymentStatus: 'refunded' }),
      ).toThrow();
      orders.updatePayment(id, { paymentStatus: 'paid' });
      expect(
        orders.updatePayment(id, { paymentStatus: 'refunded' }).paymentStatus,
      ).toBe('refunded');
    });

    it('ghi chú nội bộ lưu kèm một dòng lịch sử', () => {
      const { id } = order([{ productId: plain, quantity: 1 }]);
      const updated = orders.updateAdminNote(id, {
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

  it('lọc theo tìm kiếm, trạng thái, tài khoản; thống kê doanh thu', () => {
    const a = order([{ productId: plain, quantity: 1 }], {
      userEmail: 'khach@vd.vn',
    });
    order([{ productId: sale, quantity: 1 }], { customerName: 'Trần Thị Bé' });
    orders.updateStatus(a.id, { status: 'confirmed' });
    orders.updateStatus(a.id, { status: 'completed' });

    expect(
      orders.list({ search: 'tran thi' }).map((o) => o.customerName),
    ).toEqual(['Trần Thị Bé']);
    expect(orders.list({ search: '0905123' })).toHaveLength(2);
    expect(orders.list({ search: '0905 123' })).toHaveLength(2);
    expect(orders.list({ status: 'completed' }).map((o) => o.id)).toEqual([
      a.id,
    ]);
    expect(orders.list({ userEmail: 'KHACH@vd.vn' }).map((o) => o.id)).toEqual([
      a.id,
    ]);

    expect(orders.stats()).toMatchObject({
      total: 2,
      revenue: 3_000_000,
      today: 2,
      byStatus: { pending: 1, completed: 1 },
    });
  });
});
