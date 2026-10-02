import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { DatabaseModule } from '../database/database.module';
import { CategoriesService } from './categories.service';
import { CategoryDetailsService } from './category-details.service';

describe('CategoryDetailsService', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;
  let details: CategoryDetailsService;
  let tempDir: string;
  let categoryId: number;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-category-details-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
        }),
        DatabaseModule,
      ],
      providers: [CategoriesService, CategoryDetailsService],
    }).compile();

    await moduleRef.init();
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);
    categoryId = categories.create({ name: 'Đồ gia dụng' }).id;
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('tạo chi tiết với code tự sinh từ tên', () => {
    const created = details.create(categoryId, { name: 'Nồi cơm điện' });

    expect(typeof created.id).toBe('number');
    expect(created.code).toBe('NOI-COM-DIEN');
    expect(created.categoryId).toBe(categoryId);
    expect(created.status).toBe('active');
    // Thứ tự hiển thị đánh số từ 1 chứ không phải 0.
    expect(created.order).toBe(1);
  });

  it('từ chối code trùng trong cùng một danh mục', () => {
    details.create(categoryId, { name: 'Nồi cơm' });

    expect(() => details.create(categoryId, { name: 'Nồi cơm' })).toThrow(
      /đã được dùng trong danh mục này/,
    );
  });

  it('cho phép trùng code giữa hai danh mục khác nhau', () => {
    const other = categories.create({ name: 'Điện tử' }).id;

    const a = details.create(categoryId, { name: 'Khác', code: 'KHAC' });
    const b = details.create(other, { name: 'Khác', code: 'KHAC' });

    expect(a.code).toBe('KHAC');
    expect(b.code).toBe('KHAC');
    expect(a.categoryId).not.toBe(b.categoryId);
  });

  it('đổi code được, nhưng không đụng code khác trong cùng danh mục', () => {
    const a = details.create(categoryId, { name: 'A' });
    details.create(categoryId, { name: 'B' });

    expect(details.update(categoryId, a.id, { code: 'a-moi' }).code).toBe(
      'A-MOI',
    );
    expect(() => details.update(categoryId, a.id, { code: 'b' })).toThrow(
      /đã được dùng trong danh mục này/,
    );
  });

  it('cập nhật giữ nguyên field không gửi lên', () => {
    const created = details.create(categoryId, {
      name: 'Nồi',
      descriptions: 'Mô tả',
      order: 3,
    });

    const updated = details.update(categoryId, created.id, { name: 'Nồi to' });

    expect(updated.name).toBe('Nồi to');
    expect(updated.code).toBe('NOI');
    expect(updated.descriptions).toBe('Mô tả');
    expect(updated.order).toBe(3);
  });

  it('lọc theo từ khoá và trạng thái, sắp xếp theo order rồi tên', () => {
    details.create(categoryId, { name: 'Zulu', order: 1 });
    details.create(categoryId, { name: 'Alpha', order: 2 });
    details.create(categoryId, { name: 'Beta', order: 1, status: 'inactive' });

    expect(details.list(categoryId).map((d) => d.name)).toEqual([
      'Beta',
      'Zulu',
      'Alpha',
    ]);
    expect(details.list(categoryId, { status: 'inactive' })).toHaveLength(1);
    expect(details.list(categoryId, { search: 'alp' })).toHaveLength(1);
  });

  it('không đọc được chi tiết qua danh mục khác', () => {
    const other = categories.create({ name: 'Điện tử' }).id;
    const detail = details.create(categoryId, { name: 'Nồi' });

    expect(details.findOne(other, detail.id)).toBeNull();
    expect(() => details.findOneOrFail(other, detail.id)).toThrow(
      /Không tìm thấy/,
    );
    expect(() => details.remove(other, detail.id)).toThrow(/Không tìm thấy/);
  });

  it('báo lỗi khi danh mục cha không tồn tại', () => {
    expect(() => details.list(999)).toThrow(/Không tìm thấy danh mục/);
    expect(() => details.create(999, { name: 'X' })).toThrow(
      /Không tìm thấy danh mục/,
    );
  });

  it('xoá danh mục thì chi tiết bị xoá theo', () => {
    details.create(categoryId, { name: 'Nồi' });
    details.create(categoryId, { name: 'Chảo' });
    expect(categories.list()[0].detailCount).toBe(2);

    categories.remove(categoryId);

    const fresh = categories.create({ name: 'Đồ gia dụng' }).id;
    expect(details.list(fresh)).toHaveLength(0);
  });
});

describe('CategoryDetailsService: phân nhóm theo danh mục khác', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;
  let details: CategoryDetailsService;
  let tempDir: string;

  // Ví dụ thực tế: Phường/Xã lấy Tỉnh làm nhóm.
  let tinhId: number;
  let haNoi: { id: number };
  let hue: { id: number };
  let phuongXaId: number;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-group-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
        }),
        DatabaseModule,
      ],
      providers: [CategoriesService, CategoryDetailsService],
    }).compile();

    await moduleRef.init();
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);

    tinhId = categories.create({ name: 'Tỉnh' }).id;
    haNoi = details.create(tinhId, { name: 'Hà Nội' });
    hue = details.create(tinhId, { name: 'Huế' });
    phuongXaId = categories.create({
      name: 'Phường/Xã',
      groupCategoryId: tinhId,
    }).id;
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('danh mục nhớ nhóm và trả kèm thông tin hiển thị', () => {
    const phuongXa = categories.list().find((c) => c.id === phuongXaId)!;

    expect(phuongXa.groupCategoryId).toBe(tinhId);
    expect(phuongXa.groupCategory).toMatchObject({ id: tinhId, name: 'Tỉnh' });
    expect(
      categories.list().find((c) => c.id === tinhId)!.groupCategory,
    ).toBeNull();
  });

  it('chi tiết bắt buộc chọn nhóm khi danh mục có phân nhóm', () => {
    expect(() => details.create(phuongXaId, { name: 'Cầu Giấy' })).toThrow(
      /phải chọn nhóm cho chi tiết/,
    );

    const created = details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });
    expect(created.groupDetailId).toBe(haNoi.id);
    expect(created.group).toMatchObject({ id: haNoi.id, name: 'Hà Nội' });
  });

  it('danh mục không phân nhóm thì không nhận groupDetailId', () => {
    expect(() =>
      details.create(tinhId, { name: 'Lạ', groupDetailId: haNoi.id }),
    ).toThrow(/không phân nhóm/);
  });

  it('chỉ nhận nhóm thuộc đúng danh mục nhóm', () => {
    const khac = categories.create({ name: 'Khác' }).id;
    const la = details.create(khac, { name: 'Lạ' });

    expect(() =>
      details.create(phuongXaId, { name: 'X', groupDetailId: la.id }),
    ).toThrow(/không thuộc danh mục nhóm đã chọn/);
  });

  it('lọc chi tiết theo nhóm', () => {
    details.create(phuongXaId, { name: 'Cầu Giấy', groupDetailId: haNoi.id });
    details.create(phuongXaId, { name: 'Đống Đa', groupDetailId: haNoi.id });
    details.create(phuongXaId, { name: 'Thuỷ Biều', groupDetailId: hue.id });

    expect(details.list(phuongXaId, { groupDetailId: haNoi.id })).toHaveLength(
      2,
    );
    expect(details.list(phuongXaId, { groupDetailId: hue.id })).toHaveLength(1);
    expect(details.list(phuongXaId)).toHaveLength(3);
  });

  it('đổi nhóm của chi tiết sang tỉnh khác', () => {
    const d = details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });

    const moved = details.update(phuongXaId, d.id, { groupDetailId: hue.id });
    expect(moved.group).toMatchObject({ name: 'Huế' });
  });

  it('cập nhật trường khác thì giữ nguyên nhóm', () => {
    const d = details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });

    const updated = details.update(phuongXaId, d.id, { status: 'inactive' });
    expect(updated.groupDetailId).toBe(haNoi.id);
  });

  it('không xoá được tỉnh đang có phường trỏ vào', () => {
    details.create(phuongXaId, { name: 'Cầu Giấy', groupDetailId: haNoi.id });

    expect(() => details.remove(tinhId, haNoi.id)).toThrow(
      /đang là nhóm của 1 chi tiết khác/,
    );
    // Tỉnh chưa ai dùng thì xoá bình thường.
    expect(() => details.remove(tinhId, hue.id)).not.toThrow();
  });

  it('không xoá được danh mục đang làm nhóm cho danh mục khác', () => {
    expect(() => categories.remove(tinhId)).toThrow(
      /đang được dùng làm nhóm cho: "Phường\/Xã"/,
    );
  });

  it('không cho lấy chính mình hoặc tạo vòng làm nhóm', () => {
    expect(() =>
      categories.update(tinhId, { groupCategoryId: tinhId }),
    ).toThrow(/không thể lấy chính nó/);

    // Phường/Xã đã lấy Tỉnh làm nhóm, nên Tỉnh không được lấy Phường/Xã.
    expect(() =>
      categories.update(tinhId, { groupCategoryId: phuongXaId }),
    ).toThrow(/lặp vòng/);
  });

  it('bỏ phân nhóm thì chi tiết mất nhóm cũ', () => {
    const d = details.create(phuongXaId, {
      name: 'Cầu Giấy',
      groupDetailId: haNoi.id,
    });

    categories.update(phuongXaId, { groupCategoryId: null });

    expect(details.findOneOrFail(phuongXaId, d.id).groupDetailId).toBeNull();
    // Giờ là danh mục phẳng nên không nhận nhóm nữa.
    expect(() =>
      details.update(phuongXaId, d.id, { groupDetailId: haNoi.id }),
    ).toThrow(/không phân nhóm/);
  });
});

describe('CategoryDetailsService: thứ tự khi có phân nhóm', () => {
  let moduleRef: TestingModule;
  let categories: CategoriesService;
  let details: CategoryDetailsService;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-grouporder-'));

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({ DATABASE_FILE: path.join(tempDir, 'test.db') })],
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
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('chi tiết cùng nhóm nằm liền nhau, nhóm xếp theo order của nhóm', () => {
    const tinh = categories.create({ name: 'Tỉnh' }).id;
    const hue = details.create(tinh, { name: 'Huế', order: 1 });
    const haNoi = details.create(tinh, { name: 'Hà Nội', order: 0 });

    const px = categories.create({
      name: 'Phường/Xã',
      groupCategoryId: tinh,
    }).id;

    // Cố tình tạo đan xen và cho order trùng nhau giữa hai tỉnh — giống hệt
    // cách seeder đánh số lại từ 0 cho mỗi tỉnh.
    details.create(px, { name: 'Huế A', order: 0, groupDetailId: hue.id });
    details.create(px, { name: 'HN A', order: 0, groupDetailId: haNoi.id });
    details.create(px, { name: 'Huế B', order: 1, groupDetailId: hue.id });
    details.create(px, { name: 'HN B', order: 1, groupDetailId: haNoi.id });

    expect(details.list(px).map((d) => d.name)).toEqual([
      'HN A',
      'HN B',
      'Huế A',
      'Huế B',
    ]);
  });

  it('chi tiết chưa phân nhóm hiện lên đầu để dễ thấy mà xử lý', () => {
    const tinh = categories.create({ name: 'Tỉnh' }).id;
    const haNoi = details.create(tinh, { name: 'Hà Nội' });
    const px = categories.create({ name: 'P/X', groupCategoryId: tinh }).id;

    const co = details.create(px, { name: 'Có nhóm', groupDetailId: haNoi.id });
    // Mô phỏng dữ liệu cũ: bỏ nhóm bằng cách đổi danh mục nhóm rồi gán lại.
    categories.update(px, { groupCategoryId: null });
    categories.update(px, { groupCategoryId: tinh });
    details.update(px, co.id, { groupDetailId: haNoi.id });
    details.create(px, { name: 'Chưa nhóm', groupDetailId: haNoi.id });
    expect(details.list(px)).toHaveLength(2);
  });
});
