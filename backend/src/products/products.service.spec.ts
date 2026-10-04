import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CategoriesModule } from '../categories/categories.module';
import { CategoryDetailsService } from '../categories/category-details.service';
import { PRODUCT_CATEGORY_CODE } from '../common/product-categories';
import { DatabaseModule } from '../database/database.module';
import { discountPercentOf } from './product.entity';
import { ProductCategoriesService } from './product-categories.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let moduleRef: TestingModule;
  let tempDir: string;
  let products: ProductsService;
  let productCategories: ProductCategoriesService;
  let details: CategoryDetailsService;

  let phanMem: number;
  let haTang: number;

  const base = (overrides: Record<string, unknown> = {}) => ({
    categoryDetailId: phanMem,
    name: 'Phần mềm ERP',
    ...overrides,
  });

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-products-'));

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
      providers: [ProductsService, ProductCategoriesService],
    }).compile();

    await moduleRef.init();
    products = moduleRef.get(ProductsService);
    productCategories = moduleRef.get(ProductCategoriesService);
    details = moduleRef.get(CategoryDetailsService);

    const category = productCategories.ensureCategory();
    phanMem = details.create(category.id, {
      code: 'PHAN-MEM',
      name: 'Phần mềm',
    }).id;
    haTang = details.create(category.id, {
      code: 'HA-TANG',
      name: 'Hạ tầng',
    }).id;
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('tạo sẵn danh mục DM_LINH_VUC_SP, gọi lại không tạo trùng', () => {
    const first = productCategories.ensureCategory();
    expect(first.code).toBe(PRODUCT_CATEGORY_CODE);
    expect(productCategories.ensureCategory().id).toBe(first.id);
  });

  describe('tạo sản phẩm', () => {
    it('mặc định: nháp, còn hàng, slug sinh từ tên, chưa có giá', () => {
      const product = products.create(base());

      expect(product).toMatchObject({
        slug: 'phan-mem-erp',
        status: 'draft',
        inStock: true,
        price: null,
        effectivePrice: null,
        discountPercent: null,
        live: false,
        category: { code: 'PHAN-MEM', name: 'Phần mềm' },
      });
    });

    it('slug trùng thì thêm hậu tố', () => {
      products.create(base());
      expect(products.create(base()).slug).toBe('phan-mem-erp-2');
    });

    it('tính giá thực trả và % giảm', () => {
      const product = products.create(
        base({ price: 10_000_000, salePrice: 7_500_000 }),
      );
      expect(product.effectivePrice).toBe(7_500_000);
      expect(product.discountPercent).toBe(25);
    });

    it('chặn giá khuyến mãi không thấp hơn giá niêm yết', () => {
      expect(() =>
        products.create(base({ price: 1_000_000, salePrice: 1_000_000 })),
      ).toThrow('Giá khuyến mãi phải thấp hơn giá niêm yết');
    });

    it('chặn giá khuyến mãi khi không có giá niêm yết', () => {
      expect(() => products.create(base({ salePrice: 500_000 }))).toThrow(
        'phải nhập giá niêm yết',
      );
    });

    it('chặn lĩnh vực không thuộc DM_LINH_VUC_SP', () => {
      expect(() =>
        products.create(base({ categoryDetailId: 999_999 })),
      ).toThrow('Lĩnh vực không hợp lệ');
    });

    it('chặn trùng mã sản phẩm, không phân biệt hoa thường', () => {
      products.create(base({ sku: 'ERP-01' }));
      expect(() => products.create(base({ sku: 'erp-01' }))).toThrow(
        'đã được dùng',
      );
    });

    it('lọc HTML mô tả, mô tả rỗng thành null', () => {
      const product = products.create(
        base({ description: '<p>Mô tả</p><script>alert(1)</script>' }),
      );
      expect(product.description).toBe('<p>Mô tả</p>');
      expect(
        products.create(base({ description: '<p>&nbsp;</p>' })).description,
      ).toBeNull();
    });
  });

  describe('bộ sưu tập ảnh', () => {
    const img = (n: number) =>
      `/media/products/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;

    it('mặc định rỗng, lưu đúng thứ tự, bỏ ảnh trùng', () => {
      expect(products.create(base()).gallery).toEqual([]);
      const product = products.create(
        base({ gallery: [img(2), img(1), img(2), img(3)] }),
      );
      expect(product.gallery).toEqual([img(2), img(1), img(3)]);
    });

    it('sửa: không gửi thì giữ nguyên, gửi mảng mới thì thay cả bộ', () => {
      const product = products.create(base({ gallery: [img(1), img(2)] }));
      expect(products.update(product.id, { name: 'Khác' }).gallery).toEqual([
        img(1),
        img(2),
      ]);
      expect(
        products.update(product.id, { gallery: [img(2), img(1)] }).gallery,
      ).toEqual([img(2), img(1)]);
      expect(products.update(product.id, { gallery: [] }).gallery).toEqual([]);
    });
  });

  describe('thông số kỹ thuật', () => {
    const specs = [
      { label: 'Camera', value: '200MP' },
      { label: 'Màn hình', value: '6.7 inch, 144Hz' },
    ];

    it('mặc định rỗng, lưu đúng thứ tự', () => {
      expect(products.create(base()).specs).toEqual([]);
      expect(products.create(base({ specs })).specs).toEqual(specs);
    });

    it('sửa: không gửi thì giữ nguyên, gửi mảng mới thì thay cả bảng', () => {
      const product = products.create(base({ specs }));
      expect(products.update(product.id, { name: 'Khác' }).specs).toEqual(
        specs,
      );
      const reordered = [specs[1], specs[0]];
      expect(products.update(product.id, { specs: reordered }).specs).toEqual(
        reordered,
      );
      expect(products.update(product.id, { specs: [] }).specs).toEqual([]);
    });

    it('chặn trùng nhãn, không phân biệt hoa thường', () => {
      expect(() =>
        products.create(
          base({
            specs: [
              { label: 'Camera', value: 'a' },
              { label: 'camera', value: 'b' },
            ],
          }),
        ),
      ).toThrow('bị trùng');
    });
  });

  describe('video giới thiệu', () => {
    const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    it('lưu link hợp lệ, mặc định không có video', () => {
      expect(products.create(base()).videoUrl).toBeNull();
      expect(products.create(base({ videoUrl: youtube })).videoUrl).toBe(
        youtube,
      );
    });

    it('chặn link không nhúng được', () => {
      expect(() =>
        products.create(base({ videoUrl: 'https://evil.com/video' })),
      ).toThrow('Link video chưa được hỗ trợ');
    });

    it('sửa: không gửi thì giữ, null thì xoá', () => {
      const product = products.create(base({ videoUrl: youtube }));
      expect(products.update(product.id, { name: 'Khác' }).videoUrl).toBe(
        youtube,
      );
      expect(
        products.update(product.id, { videoUrl: null }).videoUrl,
      ).toBeNull();
    });
  });

  describe('sửa sản phẩm', () => {
    it('chỉ gửi giá khuyến mãi vẫn so với giá niêm yết hiện có', () => {
      const product = products.create(base({ price: 2_000_000 }));
      expect(() =>
        products.update(product.id, { salePrice: 3_000_000 }),
      ).toThrow('thấp hơn giá niêm yết');
      expect(
        products.update(product.id, { salePrice: 1_500_000 }).discountPercent,
      ).toBe(25);
    });

    it('xoá giá niêm yết mà còn giá khuyến mãi thì bị chặn', () => {
      const product = products.create(
        base({ price: 2_000_000, salePrice: 1_000_000 }),
      );
      expect(() => products.update(product.id, { price: null })).toThrow();
      expect(
        products.update(product.id, { price: null, salePrice: null }).price,
      ).toBeNull();
    });

    it('giữ nguyên trường không gửi', () => {
      const product = products.create(base({ sku: 'A1', summary: 'Tóm tắt' }));
      const updated = products.update(product.id, { name: 'Tên mới' });
      expect(updated).toMatchObject({
        name: 'Tên mới',
        sku: 'A1',
        summary: 'Tóm tắt',
      });
    });
  });

  describe('danh sách', () => {
    beforeEach(() => {
      products.create(
        base({
          name: 'Rẻ',
          price: 1_000_000,
          status: 'published',
          launchedAt: '2026-01-01T00:00:00.000Z',
        }),
      );
      products.create(
        base({
          name: 'Đắt giảm giá',
          price: 90_000_000,
          salePrice: 45_000_000,
          status: 'published',
          launchedAt: '2026-03-01T00:00:00.000Z',
        }),
      );
      products.create(
        base({
          name: 'Liên hệ',
          status: 'published',
          categoryDetailId: haTang,
          launchedAt: '2026-02-01T00:00:00.000Z',
        }),
      );
      products.create(base({ name: 'Nháp', price: 5_000_000 }));
    });

    const names = (list: { name: string }[]) => list.map((p) => p.name);

    it('live chỉ lấy sản phẩm đang bán', () => {
      expect(names(products.list({ live: true }))).not.toContain('Nháp');
    });

    it('mặc định sắp theo ngày ra mắt mới nhất', () => {
      expect(names(products.list({ live: true }))).toEqual([
        'Đắt giảm giá',
        'Liên hệ',
        'Rẻ',
      ]);
    });

    it('sắp theo giá thực trả, sản phẩm chưa có giá luôn cuối', () => {
      expect(names(products.list({ live: true, sort: 'price-asc' }))).toEqual([
        'Rẻ',
        'Đắt giảm giá',
        'Liên hệ',
      ]);
      expect(names(products.list({ live: true, sort: 'price-desc' }))).toEqual([
        'Đắt giảm giá',
        'Rẻ',
        'Liên hệ',
      ]);
    });

    it('lọc khoảng giá theo giá khuyến mãi, bỏ sản phẩm chưa có giá', () => {
      // Giá niêm yết 90tr nhưng khách trả 45tr → nằm trong 40–50tr.
      expect(
        names(
          products.list({
            live: true,
            minPrice: 40_000_000,
            maxPrice: 50_000_000,
          }),
        ),
      ).toEqual(['Đắt giảm giá']);
      expect(names(products.list({ live: true, minPrice: 0 }))).not.toContain(
        'Liên hệ',
      );
    });

    it('lọc theo lĩnh vực và tên không dấu', () => {
      expect(
        names(products.list({ live: true, categoryDetailId: haTang })),
      ).toEqual(['Liên hệ']);
      expect(names(products.list({ live: true, search: 'dat giam' }))).toEqual([
        'Đắt giảm giá',
      ]);
    });

    it('lấy theo danh sách id cho giỏ hàng', () => {
      const all = products.list();
      const ids = all.slice(0, 2).map((p) => p.id);
      expect(
        products
          .list({ ids })
          .map((p) => p.id)
          .sort(),
      ).toEqual([...ids].sort());
      expect(products.list({ ids: [] })).toEqual([]);
    });

    it('đếm theo lĩnh vực', () => {
      expect(products.countsByCategory(true)).toEqual({
        [phanMem]: 2,
        [haTang]: 1,
      });
    });
  });

  it('không xoá được lĩnh vực đang có sản phẩm', () => {
    products.create(base());
    const category = productCategories.ensureCategory();
    expect(() => details.remove(category.id, phanMem)).toThrow(
      'đang có 1 sản phẩm',
    );
  });

  it('discountPercentOf: tối thiểu 1%, không khuyến mãi thì null', () => {
    expect(discountPercentOf(1_000_000, 999_000)).toBe(1);
    expect(discountPercentOf(1_000_000, null)).toBeNull();
    expect(discountPercentOf(null, 1)).toBeNull();
  });
});
