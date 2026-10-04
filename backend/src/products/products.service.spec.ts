import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesModule } from '../categories/categories.module';
import { CategoryDetailsService } from '../categories/category-details.service';
import { PRODUCT_CATEGORY_CODE } from '../common/product-categories';
import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { discountPercentOf } from './product.entity';
import { ProductCategoriesService } from './product-categories.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let moduleRef: TestingModule;
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
      providers: [ProductsService, ProductCategoriesService],
    }).compile();

    await moduleRef.init();
    products = moduleRef.get(ProductsService);
    productCategories = moduleRef.get(ProductCategoriesService);
    details = moduleRef.get(CategoryDetailsService);

    const category = await productCategories.ensureCategory();
    phanMem = (
      await details.create(category.id, {
        code: 'PHAN-MEM',
        name: 'Phần mềm',
      })
    ).id;
    haTang = (
      await details.create(category.id, {
        code: 'HA-TANG',
        name: 'Hạ tầng',
      })
    ).id;
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('tạo sẵn danh mục DM_LINH_VUC_SP, gọi lại không tạo trùng', async () => {
    const first = await productCategories.ensureCategory();
    expect(first.code).toBe(PRODUCT_CATEGORY_CODE);
    expect((await productCategories.ensureCategory()).id).toBe(first.id);
  });

  describe('tạo sản phẩm', () => {
    it('mặc định: nháp, còn hàng, slug sinh từ tên, chưa có giá', async () => {
      const product = await products.create(base());

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

    it('slug trùng thì thêm hậu tố', async () => {
      await products.create(base());
      expect((await products.create(base())).slug).toBe('phan-mem-erp-2');
    });

    it('tính giá thực trả và % giảm', async () => {
      const product = await products.create(
        base({ price: 10_000_000, salePrice: 7_500_000 }),
      );
      expect(product.effectivePrice).toBe(7_500_000);
      expect(product.discountPercent).toBe(25);
    });

    it('chặn giá khuyến mãi không thấp hơn giá niêm yết', async () => {
      await expect(
        products.create(base({ price: 1_000_000, salePrice: 1_000_000 })),
      ).rejects.toThrow('Giá khuyến mãi phải thấp hơn giá niêm yết');
    });

    it('chặn giá khuyến mãi khi không có giá niêm yết', async () => {
      await expect(
        products.create(base({ salePrice: 500_000 })),
      ).rejects.toThrow('phải nhập giá niêm yết');
    });

    it('chặn lĩnh vực không thuộc DM_LINH_VUC_SP', async () => {
      await expect(
        products.create(base({ categoryDetailId: 999_999 })),
      ).rejects.toThrow('Lĩnh vực không hợp lệ');
    });

    it('chặn trùng mã sản phẩm, không phân biệt hoa thường', async () => {
      await products.create(base({ sku: 'ERP-01' }));
      await expect(products.create(base({ sku: 'erp-01' }))).rejects.toThrow(
        'đã được dùng',
      );
    });

    it('lọc HTML mô tả, mô tả rỗng thành null', async () => {
      const product = await products.create(
        base({ description: '<p>Mô tả</p><script>alert(1)</script>' }),
      );
      expect(product.description).toBe('<p>Mô tả</p>');
      expect(
        (await products.create(base({ description: '<p>&nbsp;</p>' })))
          .description,
      ).toBeNull();
    });
  });

  describe('bộ sưu tập ảnh', () => {
    const img = (n: number) =>
      `/media/products/00000000-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;

    it('mặc định rỗng, lưu đúng thứ tự, bỏ ảnh trùng', async () => {
      expect((await products.create(base())).gallery).toEqual([]);
      const product = await products.create(
        base({ gallery: [img(2), img(1), img(2), img(3)] }),
      );
      expect(product.gallery).toEqual([img(2), img(1), img(3)]);
    });

    it('sửa: không gửi thì giữ nguyên, gửi mảng mới thì thay cả bộ', async () => {
      const product = await products.create(
        base({ gallery: [img(1), img(2)] }),
      );
      expect(
        (await products.update(product.id, { name: 'Khác' })).gallery,
      ).toEqual([img(1), img(2)]);
      expect(
        (await products.update(product.id, { gallery: [img(2), img(1)] }))
          .gallery,
      ).toEqual([img(2), img(1)]);
      expect(
        (await products.update(product.id, { gallery: [] })).gallery,
      ).toEqual([]);
    });
  });

  describe('thông số kỹ thuật', () => {
    const specs = [
      { label: 'Camera', value: '200MP' },
      { label: 'Màn hình', value: '6.7 inch, 144Hz' },
    ];

    it('mặc định rỗng, lưu đúng thứ tự', async () => {
      expect((await products.create(base())).specs).toEqual([]);
      expect((await products.create(base({ specs }))).specs).toEqual(specs);
    });

    it('sửa: không gửi thì giữ nguyên, gửi mảng mới thì thay cả bảng', async () => {
      const product = await products.create(base({ specs }));
      expect(
        (await products.update(product.id, { name: 'Khác' })).specs,
      ).toEqual(specs);
      const reordered = [specs[1], specs[0]];
      expect(
        (await products.update(product.id, { specs: reordered })).specs,
      ).toEqual(reordered);
      expect((await products.update(product.id, { specs: [] })).specs).toEqual(
        [],
      );
    });

    it('chặn trùng nhãn, không phân biệt hoa thường', async () => {
      await expect(
        products.create(
          base({
            specs: [
              { label: 'Camera', value: 'a' },
              { label: 'camera', value: 'b' },
            ],
          }),
        ),
      ).rejects.toThrow('bị trùng');
    });
  });

  describe('video giới thiệu', () => {
    const youtube = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

    it('lưu link hợp lệ, mặc định không có video', async () => {
      expect((await products.create(base())).videoUrl).toBeNull();
      expect(
        (await products.create(base({ videoUrl: youtube }))).videoUrl,
      ).toBe(youtube);
    });

    it('chặn link không nhúng được', async () => {
      await expect(
        products.create(base({ videoUrl: 'https://evil.com/video' })),
      ).rejects.toThrow('Link video chưa được hỗ trợ');
    });

    it('sửa: không gửi thì giữ, null thì xoá', async () => {
      const product = await products.create(base({ videoUrl: youtube }));
      expect(
        (await products.update(product.id, { name: 'Khác' })).videoUrl,
      ).toBe(youtube);
      expect(
        (await products.update(product.id, { videoUrl: null })).videoUrl,
      ).toBeNull();
    });
  });

  describe('sửa sản phẩm', () => {
    it('chỉ gửi giá khuyến mãi vẫn so với giá niêm yết hiện có', async () => {
      const product = await products.create(base({ price: 2_000_000 }));
      await expect(
        products.update(product.id, { salePrice: 3_000_000 }),
      ).rejects.toThrow('thấp hơn giá niêm yết');
      expect(
        (await products.update(product.id, { salePrice: 1_500_000 }))
          .discountPercent,
      ).toBe(25);
    });

    it('xoá giá niêm yết mà còn giá khuyến mãi thì bị chặn', async () => {
      const product = await products.create(
        base({ price: 2_000_000, salePrice: 1_000_000 }),
      );
      await expect(
        products.update(product.id, { price: null }),
      ).rejects.toThrow();
      expect(
        (await products.update(product.id, { price: null, salePrice: null }))
          .price,
      ).toBeNull();
    });

    it('giữ nguyên trường không gửi', async () => {
      const product = await products.create(
        base({ sku: 'A1', summary: 'Tóm tắt' }),
      );
      const updated = await products.update(product.id, { name: 'Tên mới' });
      expect(updated).toMatchObject({
        name: 'Tên mới',
        sku: 'A1',
        summary: 'Tóm tắt',
      });
    });
  });

  describe('danh sách', () => {
    beforeEach(async () => {
      await products.create(
        base({
          name: 'Rẻ',
          price: 1_000_000,
          status: 'published',
          launchedAt: '2026-01-01T00:00:00.000Z',
        }),
      );
      await products.create(
        base({
          name: 'Đắt giảm giá',
          price: 90_000_000,
          salePrice: 45_000_000,
          status: 'published',
          launchedAt: '2026-03-01T00:00:00.000Z',
        }),
      );
      await products.create(
        base({
          name: 'Liên hệ',
          status: 'published',
          categoryDetailId: haTang,
          launchedAt: '2026-02-01T00:00:00.000Z',
        }),
      );
      await products.create(base({ name: 'Nháp', price: 5_000_000 }));
    });

    const names = (list: { name: string }[]) => list.map((p) => p.name);

    it('live chỉ lấy sản phẩm đang bán', async () => {
      expect(names(await products.list({ live: true }))).not.toContain('Nháp');
    });

    it('mặc định sắp theo ngày ra mắt mới nhất', async () => {
      expect(names(await products.list({ live: true }))).toEqual([
        'Đắt giảm giá',
        'Liên hệ',
        'Rẻ',
      ]);
    });

    it('sắp theo giá thực trả, sản phẩm chưa có giá luôn cuối', async () => {
      expect(
        names(await products.list({ live: true, sort: 'price-asc' })),
      ).toEqual(['Rẻ', 'Đắt giảm giá', 'Liên hệ']);
      expect(
        names(await products.list({ live: true, sort: 'price-desc' })),
      ).toEqual(['Đắt giảm giá', 'Rẻ', 'Liên hệ']);
    });

    it('lọc khoảng giá theo giá khuyến mãi, bỏ sản phẩm chưa có giá', async () => {
      // Giá niêm yết 90tr nhưng khách trả 45tr → nằm trong 40–50tr.
      expect(
        names(
          await products.list({
            live: true,
            minPrice: 40_000_000,
            maxPrice: 50_000_000,
          }),
        ),
      ).toEqual(['Đắt giảm giá']);
      expect(
        names(await products.list({ live: true, minPrice: 0 })),
      ).not.toContain('Liên hệ');
    });

    it('lọc theo lĩnh vực và tên không dấu', async () => {
      expect(
        names(await products.list({ live: true, categoryDetailId: haTang })),
      ).toEqual(['Liên hệ']);
      expect(
        names(await products.list({ live: true, search: 'dat giam' })),
      ).toEqual(['Đắt giảm giá']);
    });

    it('lấy theo danh sách id cho giỏ hàng', async () => {
      const all = await products.list();
      const ids = all.slice(0, 2).map((p) => p.id);
      expect((await products.list({ ids })).map((p) => p.id).sort()).toEqual(
        [...ids].sort(),
      );
      expect(await products.list({ ids: [] })).toEqual([]);
    });

    it('đếm theo lĩnh vực', async () => {
      expect(await products.countsByCategory(true)).toEqual({
        [phanMem]: 2,
        [haTang]: 1,
      });
    });
  });

  it('không xoá được lĩnh vực đang có sản phẩm', async () => {
    await products.create(base());
    const category = await productCategories.ensureCategory();
    await expect(details.remove(category.id, phanMem)).rejects.toThrow(
      'đang có 1 sản phẩm',
    );
  });

  it('discountPercentOf: tối thiểu 1%, không khuyến mãi thì null', () => {
    expect(discountPercentOf(1_000_000, 999_000)).toBe(1);
    expect(discountPercentOf(1_000_000, null)).toBeNull();
    expect(discountPercentOf(null, 1)).toBeNull();
  });
});
