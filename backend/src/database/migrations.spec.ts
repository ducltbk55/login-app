import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { AddressService } from '../categories/address.service';
import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import { DatabaseModule } from './database.module';
import { DatabaseService, quoteIdentifier } from './database.service';
import { MIGRATIONS } from './migrations';
import { testDatabaseConfig } from './testing';

/** Dựng module với migration BẬT (mặc định test tắt). */
async function boot(config: Record<string, string>): Promise<TestingModule> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        load: [() => config],
      }),
      DatabaseModule,
    ],
    providers: [CategoriesService, CategoryDetailsService, AddressService],
  }).compile();
  await moduleRef.init();
  return moduleRef;
}

describe('Migration danh mục từ SQLite', () => {
  let moduleRef: TestingModule;
  let config: Record<string, string>;

  beforeEach(async () => {
    // Không tự xoá khi đóng: một test khởi động lại trên cùng database.
    config = testDatabaseConfig({
      DB_SKIP_MIGRATIONS: 'false',
      DB_DROP_ON_CLOSE: 'false',
    });
    moduleRef = await boot(config);
  });

  afterEach(async () => {
    await moduleRef
      .get(DatabaseService)
      .run(`DROP DATABASE IF EXISTS ${quoteIdentifier(config.DB_NAME)}`);
    await moduleRef.close();
  });

  const count = async (sql: string, params: (string | number)[] = []) => {
    const row = await moduleRef
      .get(DatabaseService)
      .get<{ c: number }>(sql, params);
    return Number(row?.c ?? 0);
  };

  it('nạp đủ 34 tỉnh/thành và 3321 phường/xã, ghi nhận migration', async () => {
    const categories = moduleRef.get(CategoriesService);
    const list = await categories.list();
    const tinh = list.find((c) => c.code === 'DM_TINH_TP')!;
    const xa = list.find((c) => c.code === 'DM_PHUONG_XA')!;

    expect(tinh.detailCount).toBe(34);
    expect(xa.detailCount).toBe(3321);
    expect(xa.groupCategoryId).toBe(tinh.id);
    expect(list.map((c) => c.code).sort()).toEqual(
      [
        'DM_CHUC_NANG',
        'DM_CHUYEN_MUC',
        'DM_LINH_VUC_SP',
        'DM_PHUONG_XA',
        'DM_QUYEN',
        'DM_TINH_TP',
      ].sort(),
    );

    // Mọi phường/xã đều gắn vào một tỉnh/thành.
    expect(
      await count(
        `SELECT COUNT(*) AS c FROM category_details
          WHERE categoryId = ? AND groupDetailId IS NULL`,
        [xa.id],
      ),
    ).toBe(0);
    expect(await count('SELECT COUNT(*) AS c FROM migrations')).toBe(
      MIGRATIONS.length,
    );
  });

  it('địa chỉ tra được theo tỉnh sau khi migrate', async () => {
    const address = moduleRef.get(AddressService);

    expect(await address.listProvinces()).toHaveLength(34);
    const wards = await address.listWards('01');
    expect(wards.map((w) => w.name)).toContain('Phường Ba Đình');
    await expect(
      address.assertValidAddress('01', '00004'),
    ).resolves.toBeUndefined();
  });

  it('khởi động lại không chạy lại migration, giữ sửa đổi của admin', async () => {
    const details = moduleRef.get(CategoryDetailsService);
    const tinh = (await moduleRef.get(CategoriesService).list()).find(
      (c) => c.code === 'DM_TINH_TP',
    )!;
    const haNoi = (await details.list(tinh.id)).find((d) => d.code === '01')!;
    await details.update(tinh.id, haNoi.id, { name: 'TP Hà Nội (đã sửa)' });

    await moduleRef.close();
    moduleRef = await boot(config);

    // Không chèn trùng: vẫn đúng số chi tiết xuất từ SQLite.
    expect(await count('SELECT COUNT(*) AS c FROM category_details')).toBe(
      17 + 7 + 34 + 3321 + 4 + 3,
    );
    const fresh = moduleRef.get(CategoryDetailsService);
    expect((await fresh.list(tinh.id)).find((d) => d.code === '01')!.name).toBe(
      'TP Hà Nội (đã sửa)',
    );
  });
});
