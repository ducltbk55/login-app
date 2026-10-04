import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { CategoriesModule } from '../categories/categories.module';
import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import { ARTICLE_CATEGORY_CODE } from '../common/article-categories';
import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import { ArticleCategoriesService } from './article-categories.service';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  let moduleRef: TestingModule;
  let articles: ArticlesService;
  let articleCategories: ArticleCategoriesService;
  let categories: CategoriesService;
  let details: CategoryDetailsService;

  /** Id của chuyên mục "Tin nội bộ", dùng cho phần lớn test. */
  let tinNoiBo: number;

  const draft = () => ({
    categoryDetailId: tinNoiBo,
    title: 'Bài thử nghiệm',
    content: 'Nội dung bài viết thử nghiệm.',
    author: 'Lê Trung Đức',
  });

  const detailId = async (code: string) =>
    (await articleCategories.list()).find((d) => d.code === code)!.id;

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
      providers: [ArticlesService, ArticleCategoriesService],
    }).compile();

    await moduleRef.init();
    articles = moduleRef.get(ArticlesService);
    articleCategories = moduleRef.get(ArticleCategoriesService);
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);

    tinNoiBo = await detailId('TIN_NOI_BO');
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  describe('danh mục chuyên mục', () => {
    it('tạo sẵn DM_CHUYEN_MUC với 4 chuyên mục mặc định', async () => {
      const category = await articleCategories.category();
      expect(category?.code).toBe(ARTICLE_CATEGORY_CODE);

      expect((await articleCategories.list()).map((d) => d.name)).toEqual([
        'Tin nội bộ',
        'Hoạt động khách hàng',
        'Tin công nghệ',
        'Công nghệ thế giới',
      ]);
    });

    it('chạy seed lần nữa không tạo trùng', async () => {
      await articleCategories.ensureSeeded();
      await articleCategories.ensureSeeded();

      expect(await articleCategories.list()).toHaveLength(4);
      expect(
        (await categories.list()).filter(
          (c) => c.code === ARTICLE_CATEGORY_CODE,
        ),
      ).toHaveLength(1);
    });

    it('giữ nguyên tên chuyên mục mà admin đã sửa', async () => {
      const category = (await articleCategories.category())!;
      await details.update(category.id, tinNoiBo, {
        name: 'Tin trong công ty',
      });

      await articleCategories.ensureSeeded();

      expect(await articles.list()).toEqual([]);
      expect(
        (await articleCategories.list()).find((d) => d.id === tinNoiBo)?.name,
      ).toBe('Tin trong công ty');
    });
  });

  describe('tạo bài', () => {
    it('sinh slug từ tiêu đề, bỏ dấu tiếng Việt', async () => {
      const article = await articles.create({
        ...draft(),
        title: 'Chuyển đổi số cho doanh nghiệp',
      });

      expect(article.slug).toBe('chuyen-doi-so-cho-doanh-nghiep');
    });

    it('trùng slug thì nối số thứ tự thay vì báo lỗi', async () => {
      const first = await articles.create(draft());
      const second = await articles.create(draft());
      const third = await articles.create(draft());

      expect([first.slug, second.slug, third.slug]).toEqual([
        'bai-thu-nghiem',
        'bai-thu-nghiem-2',
        'bai-thu-nghiem-3',
      ]);
    });

    it('mặc định là bản nháp, chưa có ngày đăng, chưa lên sóng', async () => {
      const article = await articles.create(draft());

      expect(article.status).toBe('draft');
      expect(article.publishedAt).toBeNull();
      expect(article.live).toBe(false);
      expect(article.viewCount).toBe(0);
      expect(article.featured).toBe(false);
    });

    it('xuất bản mà không chọn ngày thì lấy thời điểm hiện tại', async () => {
      const article = await articles.create({
        ...draft(),
        status: 'published',
      });

      expect(article.publishedAt).not.toBeNull();
      expect(article.live).toBe(true);
    });

    it('kèm chuyên mục để khỏi phải gọi thêm một vòng', async () => {
      const article = await articles.create(draft());

      expect(article.category).toMatchObject({
        id: tinNoiBo,
        code: 'TIN_NOI_BO',
        name: 'Tin nội bộ',
      });
    });

    it('ước lượng số phút đọc từ độ dài nội dung', async () => {
      const short = await articles.create(draft());
      const long = await articles.create({
        ...draft(),
        title: 'Bài dài',
        content: Array.from({ length: 600 }, () => 'từ').join(' '),
      });

      expect(short.readingMinutes).toBe(1); // ngắn mấy cũng tính 1 phút
      expect(long.readingMinutes).toBe(3); // 600 / 200
    });

    it('từ chối chuyên mục không thuộc DM_CHUYEN_MUC', async () => {
      const other = await categories.create({
        code: 'DM_KHAC',
        name: 'Danh mục khác',
      });
      const foreign = await details.create(other.id, {
        code: 'X',
        name: 'X',
      });

      await expect(
        articles.create({ ...draft(), categoryDetailId: foreign.id }),
      ).rejects.toThrow(/Chuyên mục không hợp lệ/);
    });

    it('từ chối chuyên mục đã tắt', async () => {
      const category = (await articleCategories.category())!;
      await details.update(category.id, tinNoiBo, { status: 'inactive' });

      await expect(articles.create(draft())).rejects.toThrow(/đang tắt/);
    });

    it('từ chối chuyên mục không tồn tại', async () => {
      await expect(
        articles.create({ ...draft(), categoryDetailId: 99999 }),
      ).rejects.toThrow(/Chuyên mục không hợp lệ/);
    });
  });

  describe('đặt lịch đăng', () => {
    it('ngày đăng ở tương lai thì chưa lên sóng', async () => {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
      const article = await articles.create({
        ...draft(),
        status: 'published',
        publishedAt: tomorrow,
      });

      expect(article.status).toBe('published');
      expect(article.live).toBe(false);
    });

    it('bộ lọc live bỏ qua bài hẹn giờ và bài nháp', async () => {
      await articles.create({ ...draft(), title: 'Nháp' });
      await articles.create({
        ...draft(),
        title: 'Hẹn giờ',
        status: 'published',
        publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
      });
      await articles.create({
        ...draft(),
        title: 'Đang đăng',
        status: 'published',
      });

      expect((await articles.list({ live: true })).map((a) => a.title)).toEqual(
        ['Đang đăng'],
      );
    });

    it('bài lưu trữ cũng không lên sóng', async () => {
      const article = await articles.create({
        ...draft(),
        status: 'published',
      });
      const archived = await articles.update(article.id, {
        status: 'archived',
      });

      expect(archived.live).toBe(false);
      expect(await articles.list({ live: true })).toEqual([]);
      // Ngày đăng cũ vẫn giữ, để biết bài từng lên sóng lúc nào.
      expect(archived.publishedAt).toBe(article.publishedAt);
    });
  });

  describe('sửa bài', () => {
    it('trường không gửi lên thì giữ nguyên', async () => {
      const article = await articles.create({
        ...draft(),
        summary: 'Tóm tắt gốc',
        coverImage: 'https://example.com/a.png',
      });

      const updated = await articles.update(article.id, {
        title: 'Tiêu đề mới',
      });

      expect(updated.title).toBe('Tiêu đề mới');
      expect(updated.summary).toBe('Tóm tắt gốc');
      expect(updated.coverImage).toBe('https://example.com/a.png');
      expect(updated.author).toBe(article.author);
      // Đổi tiêu đề không đổi slug: link đã chia sẻ ra ngoài phải còn sống.
      expect(updated.slug).toBe(article.slug);
    });

    it('gửi slug mới thì đổi, vẫn bảo đảm duy nhất', async () => {
      await articles.create({ ...draft(), title: 'Bài A' });
      const b = await articles.create({ ...draft(), title: 'Bài B' });

      expect((await articles.update(b.id, { slug: 'bai-a' })).slug).toBe(
        'bai-a-2',
      );
    });

    it('giữ nguyên slug của chính nó khi gửi lại y hệt', async () => {
      const article = await articles.create(draft());
      expect(
        (await articles.update(article.id, { slug: article.slug })).slug,
      ).toBe(article.slug);
    });

    it('xoá rỗng tóm tắt được', async () => {
      const article = await articles.create({
        ...draft(),
        summary: 'Có tóm tắt',
      });
      expect(
        (await articles.update(article.id, { summary: null })).summary,
      ).toBeNull();
    });

    it('chuyển nháp sang xuất bản thì tự điền ngày đăng', async () => {
      const article = await articles.create(draft());
      expect(article.publishedAt).toBeNull();

      const published = await articles.update(article.id, {
        status: 'published',
      });
      expect(published.publishedAt).not.toBeNull();
      expect(published.live).toBe(true);
    });

    it('đổi sang chuyên mục không hợp lệ thì bị chặn', async () => {
      const article = await articles.create(draft());
      await expect(
        articles.update(article.id, { categoryDetailId: 99999 }),
      ).rejects.toThrow(/Chuyên mục không hợp lệ/);
    });
  });

  describe('danh sách', () => {
    beforeEach(async () => {
      const congNghe = await detailId('TIN_CONG_NGHE');

      await articles.create({
        ...draft(),
        title: 'Tin cũ',
        status: 'published',
        publishedAt: '2026-01-01T00:00:00.000Z',
      });
      await articles.create({
        ...draft(),
        title: 'Tin mới',
        status: 'published',
        publishedAt: '2026-06-01T00:00:00.000Z',
      });
      await articles.create({
        ...draft(),
        categoryDetailId: congNghe,
        title: 'Chuyện công nghệ',
        status: 'published',
        publishedAt: '2026-03-01T00:00:00.000Z',
      });
      await articles.create({
        ...draft(),
        title: 'Bài nổi bật',
        status: 'published',
        publishedAt: '2025-01-01T00:00:00.000Z',
        featured: true,
      });
    });

    it('bài nổi bật lên đầu, phần còn lại mới nhất trước', async () => {
      expect((await articles.list()).map((a) => a.title)).toEqual([
        'Bài nổi bật',
        'Tin mới',
        'Chuyện công nghệ',
        'Tin cũ',
      ]);
    });

    it('lọc theo chuyên mục', async () => {
      const congNghe = await detailId('TIN_CONG_NGHE');

      expect(
        (await articles.list({ categoryDetailId: congNghe })).map(
          (a) => a.title,
        ),
      ).toEqual(['Chuyện công nghệ']);
    });

    it('tìm kiếm bỏ dấu, không phân biệt hoa thường', async () => {
      expect(
        (await articles.list({ search: 'cong nghe' })).map((a) => a.title),
      ).toEqual(['Chuyện công nghệ']);
    });

    it('tìm được theo tên tác giả', async () => {
      expect(await articles.list({ search: 'duc' })).toHaveLength(4);
    });

    it('đếm bài theo từng chuyên mục', async () => {
      const congNghe = await detailId('TIN_CONG_NGHE');

      expect(await articles.countsByCategory()).toEqual({
        [tinNoiBo]: 3,
        [congNghe]: 1,
      });
    });
  });

  describe('lượt xem', () => {
    it('tăng theo slug và không đụng tới updatedAt', async () => {
      const article = await articles.create(draft());

      await articles.recordView(article.slug);
      await articles.recordView(article.slug);
      const after = await articles.findOneOrFail(article.id);

      expect(after.viewCount).toBe(2);
      expect(after.updatedAt).toBe(article.updatedAt);
    });
  });

  describe('xoá', () => {
    it('xoá được bài viết', async () => {
      const article = await articles.create(draft());
      await articles.remove(article.id);

      expect(await articles.findOne(article.id)).toBeNull();
    });

    it('không xoá được chuyên mục đang có bài', async () => {
      const category = (await articleCategories.category())!;
      await articles.create(draft());

      await expect(details.remove(category.id, tinNoiBo)).rejects.toThrow(
        /đang có 1 bài viết/,
      );
    });

    it('xoá hết bài thì xoá được chuyên mục', async () => {
      const category = (await articleCategories.category())!;
      const article = await articles.create(draft());
      await articles.remove(article.id);

      await expect(
        details.remove(category.id, tinNoiBo),
      ).resolves.toBeUndefined();
    });
  });
});
