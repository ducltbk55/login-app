import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { CategoriesService } from './categories.service';
import { CategoryDetailsService } from './category-details.service';

describe('CategoryDetailsService', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;
  let details: CategoryDetailsService;
  let categoryId: number;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => testDatabaseConfig()],
        }),
        DatabaseModule,
      ],
      providers: [CategoriesService, CategoryDetailsService],
    }).compile();

    await moduleRef.init();
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);
    categoryId = (await categories.create({ name: 'Đồ gia dụng' })).id;
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('tạo chi tiết với code tự sinh từ tên', async () => {
    const created = await details.create(categoryId, { name: 'Nồi cơm điện' });

    expect(typeof created.id).toBe('number');
    expect(created.code).toBe('NOI-COM-DIEN');
    expect(created.categoryId).toBe(categoryId);
    expect(created.status).toBe('active');
    // Thứ tự hiển thị đánh số từ 1 chứ không phải 0.
    expect(created.order).toBe(1);
  });

  it('từ chối code trùng trong cùng một danh mục', async () => {
    await details.create(categoryId, { name: 'Nồi cơm' });

    await expect(
      details.create(categoryId, { name: 'Nồi cơm' }),
    ).rejects.toThrow(/đã được dùng trong danh mục này/);
  });

  it('cho phép trùng code giữa hai danh mục khác nhau', async () => {
    const other = (await categories.create({ name: 'Điện tử' })).id;

    const a = await details.create(categoryId, { name: 'Khác', code: 'KHAC' });
    const b = await details.create(other, { name: 'Khác', code: 'KHAC' });

    expect(a.code).toBe('KHAC');
    expect(b.code).toBe('KHAC');
    expect(a.categoryId).not.toBe(b.categoryId);
  });

  it('đổi code được, nhưng không đụng code khác trong cùng danh mục', async () => {
    const a = await details.create(categoryId, { name: 'A' });
    await details.create(categoryId, { name: 'B' });

    expect(
      (await details.update(categoryId, a.id, { code: 'a-moi' })).code,
    ).toBe('A-MOI');
    await expect(
      details.update(categoryId, a.id, { code: 'b' }),
    ).rejects.toThrow(/đã được dùng trong danh mục này/);
  });

  it('cập nhật giữ nguyên field không gửi lên', async () => {
    const created = await details.create(categoryId, {
      name: 'Nồi',
      descriptions: 'Mô tả',
      order: 3,
    });

    const updated = await details.update(categoryId, created.id, {
      name: 'Nồi to',
    });

    expect(updated.name).toBe('Nồi to');
    expect(updated.code).toBe('NOI');
    expect(updated.descriptions).toBe('Mô tả');
    expect(updated.order).toBe(3);
  });

  it('lọc theo từ khoá và trạng thái, sắp xếp theo order rồi tên', async () => {
    await details.create(categoryId, { name: 'Zulu', order: 1 });
    await details.create(categoryId, { name: 'Alpha', order: 2 });
    await details.create(categoryId, {
      name: 'Beta',
      order: 1,
      status: 'inactive',
    });

    expect((await details.list(categoryId)).map((d) => d.name)).toEqual([
      'Beta',
      'Zulu',
      'Alpha',
    ]);
    expect(await details.list(categoryId, { status: 'inactive' })).toHaveLength(
      1,
    );
    expect(await details.list(categoryId, { search: 'alp' })).toHaveLength(1);
  });

  it('không đọc được chi tiết qua danh mục khác', async () => {
    const other = (await categories.create({ name: 'Điện tử' })).id;
    const detail = await details.create(categoryId, { name: 'Nồi' });

    expect(await details.findOne(other, detail.id)).toBeNull();
    await expect(details.findOneOrFail(other, detail.id)).rejects.toThrow(
      /Không tìm thấy/,
    );
    await expect(details.remove(other, detail.id)).rejects.toThrow(
      /Không tìm thấy/,
    );
  });

  it('báo lỗi khi danh mục cha không tồn tại', async () => {
    await expect(details.list(999)).rejects.toThrow(/Không tìm thấy danh mục/);
    await expect(details.create(999, { name: 'X' })).rejects.toThrow(
      /Không tìm thấy danh mục/,
    );
  });

  it('xoá danh mục thì chi tiết bị xoá theo', async () => {
    await details.create(categoryId, { name: 'Nồi' });
    await details.create(categoryId, { name: 'Chảo' });
    expect((await categories.list())[0].detailCount).toBe(2);

    await categories.remove(categoryId);

    const fresh = (await categories.create({ name: 'Đồ gia dụng' })).id;
    expect(await details.list(fresh)).toHaveLength(0);
  });
});

describe('CategoryDetailsService: phân nhóm theo danh mục khác', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;
  let details: CategoryDetailsService;

  // Ví dụ thực tế: Phường/Xã lấy Tỉnh làm nhóm.
  let tinhId: number;
  let haNoi: { id: number };
  let hue: { id: number };
  let phuongXaId: number;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => testDatabaseConfig()],
        }),
        DatabaseModule,
      ],
      providers: [CategoriesService, CategoryDetailsService],
    }).compile();

    await moduleRef.init();
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);

    tinhId = (await categories.create({ name: 'Tỉnh' })).id;
    haNoi = await details.create(tinhId, { name: 'Hà Nội' });
    hue = await details.create(tinhId, { name: 'Huế' });
    phuongXaId = (
      await categories.create({
        name: 'Phường/Xã',
        groupCategoryId: tinhId,
      })
    ).id;
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('danh mục nhớ nhóm và trả kèm thông tin hiển thị', async () => {
    const list = await categories.list();
    const phuongXa = list.find((c) => c.id === phuongXaId)!;

    expect(phuongXa.groupCategoryId).toBe(tinhId);
    expect(phuongXa.groupCategory).toMatchObject({ id: tinhId, name: 'Tỉnh' });
    expect(list.find((c) => c.id === tinhId)!.groupCategory).toBeNull();
  });

  it('chi tiết bắt buộc chọn nhóm khi danh mục có phân nhóm', async () => {
    await expect(
      details.create(phuongXaId, { name: 'Cầu Giấy' }),
    ).rejects.toThrow(/phải chọn nhóm cho chi tiết/);

    const created = await details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });
    expect(created.groupDetailId).toBe(haNoi.id);
    expect(created.group).toMatchObject({ id: haNoi.id, name: 'Hà Nội' });
  });

  it('danh mục không phân nhóm thì không nhận groupDetailId', async () => {
    await expect(
      details.create(tinhId, { name: 'Lạ', groupDetailId: haNoi.id }),
    ).rejects.toThrow(/không phân nhóm/);
  });

  it('chỉ nhận nhóm thuộc đúng danh mục nhóm', async () => {
    const khac = (await categories.create({ name: 'Khác' })).id;
    const la = await details.create(khac, { name: 'Lạ' });

    await expect(
      details.create(phuongXaId, { name: 'X', groupDetailId: la.id }),
    ).rejects.toThrow(/không thuộc danh mục nhóm đã chọn/);
  });

  it('lọc chi tiết theo nhóm', async () => {
    await details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });
    await details.create(phuongXaId, {
      name: 'Đống Đa',
      groupDetailId: haNoi.id,
    });
    await details.create(phuongXaId, {
      name: 'Thuỷ Biều',
      groupDetailId: hue.id,
    });

    expect(
      await details.list(phuongXaId, { groupDetailId: haNoi.id }),
    ).toHaveLength(2);
    expect(
      await details.list(phuongXaId, { groupDetailId: hue.id }),
    ).toHaveLength(1);
    expect(await details.list(phuongXaId)).toHaveLength(3);
  });

  it('đổi nhóm của chi tiết sang tỉnh khác', async () => {
    const d = await details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });

    const moved = await details.update(phuongXaId, d.id, {
      groupDetailId: hue.id,
    });
    expect(moved.group).toMatchObject({ name: 'Huế' });
  });

  it('cập nhật trường khác thì giữ nguyên nhóm', async () => {
    const d = await details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });

    const updated = await details.update(phuongXaId, d.id, {
      status: 'inactive',
    });
    expect(updated.groupDetailId).toBe(haNoi.id);
  });

  it('không xoá được tỉnh đang có phường trỏ vào', async () => {
    await details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });

    await expect(details.remove(tinhId, haNoi.id)).rejects.toThrow(
      /đang là nhóm của 1 chi tiết khác/,
    );
    // Tỉnh chưa ai dùng thì xoá bình thường.
    await expect(details.remove(tinhId, hue.id)).resolves.toBeUndefined();
  });

  it('không xoá được danh mục đang làm nhóm cho danh mục khác', async () => {
    await expect(categories.remove(tinhId)).rejects.toThrow(
      /đang được dùng làm nhóm cho: "Phường\/Xã"/,
    );
  });

  it('không cho lấy chính mình hoặc tạo vòng làm nhóm', async () => {
    await expect(
      categories.update(tinhId, { groupCategoryId: tinhId }),
    ).rejects.toThrow(/không thể lấy chính nó/);

    // Phường/Xã đã lấy Tỉnh làm nhóm, nên Tỉnh không được lấy Phường/Xã.
    await expect(
      categories.update(tinhId, { groupCategoryId: phuongXaId }),
    ).rejects.toThrow(/lặp vòng/);
  });

  it('bỏ phân nhóm thì chi tiết mất nhóm cũ', async () => {
    const d = await details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });

    await categories.update(phuongXaId, { groupCategoryId: null });

    expect(
      (await details.findOneOrFail(phuongXaId, d.id)).groupDetailId,
    ).toBeNull();
    // Giờ là danh mục phẳng nên không nhận nhóm nữa.
    await expect(
      details.update(phuongXaId, d.id, { groupDetailId: haNoi.id }),
    ).rejects.toThrow(/không phân nhóm/);
  });
});

describe('CategoryDetailsService: thứ tự khi có phân nhóm', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;
  let details: CategoryDetailsService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => testDatabaseConfig()],
        }),
        DatabaseModule,
      ],
      providers: [CategoriesService, CategoryDetailsService],
    }).compile();

    await moduleRef.init();
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('chi tiết cùng nhóm nằm liền nhau, nhóm xếp theo order của nhóm', async () => {
    const tinh = (await categories.create({ name: 'Tỉnh' })).id;
    const hue = await details.create(tinh, { name: 'Huế', order: 1 });
    const haNoi = await details.create(tinh, { name: 'Hà Nội', order: 0 });

    const px = (
      await categories.create({
        name: 'Phường/Xã',
        groupCategoryId: tinh,
      })
    ).id;

    // Cố tình tạo đan xen và cho order trùng nhau giữa hai tỉnh — giống hệt
    // cách seeder đánh số lại từ 0 cho mỗi tỉnh.
    await details.create(px, {
      name: 'Huế A',
      order: 0,
      groupDetailId: hue.id,
    });
    await details.create(px, {
      name: 'HN A',
      order: 0,
      groupDetailId: haNoi.id,
    });
    await details.create(px, {
      name: 'Huế B',
      order: 1,
      groupDetailId: hue.id,
    });
    await details.create(px, {
      name: 'HN B',
      order: 1,
      groupDetailId: haNoi.id,
    });

    expect((await details.list(px)).map((d) => d.name)).toEqual([
      'HN A',
      'HN B',
      'Huế A',
      'Huế B',
    ]);
  });

  it('chi tiết chưa phân nhóm hiện lên đầu để dễ thấy mà xử lý', async () => {
    const tinh = (await categories.create({ name: 'Tỉnh' })).id;
    const haNoi = await details.create(tinh, { name: 'Hà Nội' });
    const px = (await categories.create({ name: 'P/X', groupCategoryId: tinh }))
      .id;

    const co = await details.create(px, {
      name: 'Có nhóm',
      groupDetailId: haNoi.id,
    });
    // Mô phỏng dữ liệu cũ: bỏ nhóm bằng cách đổi danh mục nhóm rồi gán lại.
    await categories.update(px, { groupCategoryId: null });
    await categories.update(px, { groupCategoryId: tinh });
    await details.update(px, co.id, { groupDetailId: haNoi.id });
    await details.create(px, { name: 'Chưa nhóm', groupDetailId: haNoi.id });
    expect(await details.list(px)).toHaveLength(2);
  });
});
