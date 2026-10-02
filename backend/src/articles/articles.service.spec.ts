import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { CategoriesModule } from '../categories/categories.module';
import { CategoriesService } from '../categories/categories.service';
import { CategoryDetailsService } from '../categories/category-details.service';
import { ARTICLE_CATEGORY_CODE } from '../common/article-categories';
import { DatabaseModule } from '../database/database.module';
import { ArticleCategoriesService } from './article-categories.service';
import { ArticlesService } from './articles.service';

describe('ArticlesService', () => {
  let moduleRef: TestingModule;
  let tempDir: string;
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

  beforeEach(async () => {
    tempDir = mkdtempSync(path.join(tmpdir(), 'nest-articles-'));

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
      providers: [ArticlesService, ArticleCategoriesService],
    }).compile();

    await moduleRef.init();
    articles = moduleRef.get(ArticlesService);
    articleCategories = moduleRef.get(ArticleCategoriesService);
    categories = moduleRef.get(CategoriesService);
    details = moduleRef.get(CategoryDetailsService);

    tinNoiBo = articleCategories
      .list()
      .find((d) => d.code === 'TIN_NOI_BO')!.id;
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('danh mục chuyên mục', () => {
    it('tạo sẵn DM_CHUYEN_MUC với 4 chuyên mục mặc định', () => {
      const category = articleCategories.category();
      expect(category?.code).toBe(ARTICLE_CATEGORY_CODE);

      expect(articleCategories.list().map((d) => d.name)).toEqual([
        'Tin nội bộ',
        'Hoạt động khách hàng',
        'Tin công nghệ',
        'Công nghệ thế giới',
      ]);
    });

    it('chạy seed lần nữa không tạo trùng', () => {
      articleCategories.ensureSeeded();
      articleCategories.ensureSeeded();

      expect(articleCategories.list()).toHaveLength(4);
      expect(
        categories.list().filter((c) => c.code === ARTICLE_CATEGORY_CODE),
      ).toHaveLength(1);
    });

    it('giữ nguyên tên chuyên mục mà admin đã sửa', () => {
      const category = articleCategories.category()!;
      details.update(category.id, tinNoiBo, { name: 'Tin trong công ty' });

      articleCategories.ensureSeeded();

      expect(articles.list()).toEqual([]);
      expect(
        articleCategories.list().find((d) => d.id === tinNoiBo)?.name,
      ).toBe('Tin trong công ty');
    });
  });

  describe('tạo bài', () => {
    it('sinh slug từ tiêu đề, bỏ dấu tiếng Việt', () => {
      const article = articles.create({
        ...draft(),
        title: 'Chuyển đổi số cho doanh nghiệp',
      });

      expect(article.slug).toBe('chuyen-doi-so-cho-doanh-nghiep');
    });

    it('trùng slug thì nối số thứ tự thay vì báo lỗi', () => {
      const first = articles.create(draft());
      const second = articles.create(draft());
      const third = articles.create(draft());

      expect([first.slug, second.slug, third.slug]).toEqual([
        'bai-thu-nghiem',
        'bai-thu-nghiem-2',
        'bai-thu-nghiem-3',
      ]);
    });

    it('mặc định là bản nháp, chưa có ngày đăng, chưa lên sóng', () => {
      const article = articles.create(draft());

      expect(article.status).toBe('draft');
      expect(article.publishedAt).toBeNull();
      expect(article.live).toBe(false);
      expect(article.viewCount).toBe(0);
      expect(article.featured).toBe(false);
    });

    it('xuất bản mà không chọn ngày thì lấy thời điểm hiện tại', () => {
      const article = articles.create({ ...draft(), status: 'published' });

      expect(article.publishedAt).not.toBeNull();
      expect(article.live).toBe(true);
    });

    it('kèm chuyên mục để khỏi phải gọi thêm một vòng', () => {
      const article = articles.create(draft());

      expect(article.category).toMatchObject({
        id: tinNoiBo,
        code: 'TIN_NOI_BO',
        name: 'Tin nội bộ',
      });
    });

    it('ước lượng số phút đọc từ độ dài nội dung', () => {
      const short = articles.create(draft());
      const long = articles.create({
        ...draft(),
        title: 'Bài dài',
        content: Array.from({ length: 600 }, () => 'từ').join(' '),
      });

      expect(short.readingMinutes).toBe(1); // ngắn mấy cũng tính 1 phút
      expect(long.readingMinutes).toBe(3); // 600 / 200
    });

    it('từ chối chuyên mục không thuộc DM_CHUYEN_MUC', () => {
      const other = categories.create({
        code: 'DM_KHAC',
        name: 'Danh mục khác',
      });
      const foreign = details.create(other.id, { code: 'X', name: 'X' });

      expect(() =>
        articles.create({ ...draft(), categoryDetailId: foreign.id }),
      ).toThrow(/Chuyên mục không hợp lệ/);
    });

    it('từ chối chuyên mục đã tắt', () => {
      const category = articleCategories.category()!;
      details.update(category.id, tinNoiBo, { status: 'inactive' });

      expect(() => articles.create(draft())).toThrow(/đang tắt/);
    });

    it('từ chối chuyên mục không tồn tại', () => {
      expect(() =>
        articles.create({ ...draft(), categoryDetailId: 99999 }),
      ).toThrow(/Chuyên mục không hợp lệ/);
    });
  });

  describe('đặt lịch đăng', () => {
    it('ngày đăng ở tương lai thì chưa lên sóng', () => {
      const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
      const article = articles.create({
        ...draft(),
        status: 'published',
        publishedAt: tomorrow,
      });

      expect(article.status).toBe('published');
      expect(article.live).toBe(false);
    });

    it('bộ lọc live bỏ qua bài hẹn giờ và bài nháp', () => {
      articles.create({ ...draft(), title: 'Nháp' });
      articles.create({
        ...draft(),
        title: 'Hẹn giờ',
        status: 'published',
        publishedAt: new Date(Date.now() + 86_400_000).toISOString(),
      });
      articles.create({ ...draft(), title: 'Đang đăng', status: 'published' });

      expect(articles.list({ live: true }).map((a) => a.title)).toEqual([
        'Đang đăng',
      ]);
    });

    it('bài lưu trữ cũng không lên sóng', () => {
      const article = articles.create({ ...draft(), status: 'published' });
      const archived = articles.update(article.id, { status: 'archived' });

      expect(archived.live).toBe(false);
      expect(articles.list({ live: true })).toEqual([]);
      // Ngày đăng cũ vẫn giữ, để biết bài từng lên sóng lúc nào.
      expect(archived.publishedAt).toBe(article.publishedAt);
    });
  });

  describe('sửa bài', () => {
    it('trường không gửi lên thì giữ nguyên', () => {
      const article = articles.create({
        ...draft(),
        summary: 'Tóm tắt gốc',
        coverImage: 'https://example.com/a.png',
      });

      const updated = articles.update(article.id, { title: 'Tiêu đề mới' });

      expect(updated.title).toBe('Tiêu đề mới');
      expect(updated.summary).toBe('Tóm tắt gốc');
      expect(updated.coverImage).toBe('https://example.com/a.png');
      expect(updated.author).toBe(article.author);
      // Đổi tiêu đề không đổi slug: link đã chia sẻ ra ngoài phải còn sống.
      expect(updated.slug).toBe(article.slug);
    });

    it('gửi slug mới thì đổi, vẫn bảo đảm duy nhất', () => {
      articles.create({ ...draft(), title: 'Bài A' });
      const b = articles.create({ ...draft(), title: 'Bài B' });

      expect(articles.update(b.id, { slug: 'bai-a' }).slug).toBe('bai-a-2');
    });

    it('giữ nguyên slug của chính nó khi gửi lại y hệt', () => {
      const article = articles.create(draft());
      expect(articles.update(article.id, { slug: article.slug }).slug).toBe(
        article.slug,
      );
    });

    it('xoá rỗng tóm tắt được', () => {
      const article = articles.create({ ...draft(), summary: 'Có tóm tắt' });
      expect(articles.update(article.id, { summary: null }).summary).toBeNull();
    });

    it('chuyển nháp sang xuất bản thì tự điền ngày đăng', () => {
      const article = articles.create(draft());
      expect(article.publishedAt).toBeNull();

      const published = articles.update(article.id, { status: 'published' });
      expect(published.publishedAt).not.toBeNull();
      expect(published.live).toBe(true);
    });

    it('đổi sang chuyên mục không hợp lệ thì bị chặn', () => {
      const article = articles.create(draft());
      expect(() =>
        articles.update(article.id, { categoryDetailId: 99999 }),
      ).toThrow(/Chuyên mục không hợp lệ/);
    });
  });

  describe('danh sách', () => {
    beforeEach(() => {
      const congNghe = articleCategories
        .list()
        .find((d) => d.code === 'TIN_CONG_NGHE')!.id;

      articles.create({
        ...draft(),
        title: 'Tin cũ',
        status: 'published',
        publishedAt: '2026-01-01T00:00:00.000Z',
      });
      articles.create({
        ...draft(),
        title: 'Tin mới',
        status: 'published',
        publishedAt: '2026-06-01T00:00:00.000Z',
      });
      articles.create({
        ...draft(),
        categoryDetailId: congNghe,
        title: 'Chuyện công nghệ',
        status: 'published',
        publishedAt: '2026-03-01T00:00:00.000Z',
      });
      articles.create({
        ...draft(),
        title: 'Bài nổi bật',
        status: 'published',
        publishedAt: '2025-01-01T00:00:00.000Z',
        featured: true,
      });
    });

    it('bài nổi bật lên đầu, phần còn lại mới nhất trước', () => {
      expect(articles.list().map((a) => a.title)).toEqual([
        'Bài nổi bật',
        'Tin mới',
        'Chuyện công nghệ',
        'Tin cũ',
      ]);
    });

    it('lọc theo chuyên mục', () => {
      const congNghe = articleCategories
        .list()
        .find((d) => d.code === 'TIN_CONG_NGHE')!.id;

      expect(
        articles.list({ categoryDetailId: congNghe }).map((a) => a.title),
      ).toEqual(['Chuyện công nghệ']);
    });

    it('tìm kiếm bỏ dấu, không phân biệt hoa thường', () => {
      expect(
        articles.list({ search: 'cong nghe' }).map((a) => a.title),
      ).toEqual(['Chuyện công nghệ']);
    });

    it('tìm được theo tên tác giả', () => {
      expect(articles.list({ search: 'duc' })).toHaveLength(4);
    });

    it('đếm bài theo từng chuyên mục', () => {
      const congNghe = articleCategories
        .list()
        .find((d) => d.code === 'TIN_CONG_NGHE')!.id;

      expect(articles.countsByCategory()).toEqual({
        [tinNoiBo]: 3,
        [congNghe]: 1,
      });
    });
  });

  describe('lượt xem', () => {
    it('tăng theo slug và không đụng tới updatedAt', () => {
      const article = articles.create(draft());

      articles.recordView(article.slug);
      articles.recordView(article.slug);
      const after = articles.findOneOrFail(article.id);

      expect(after.viewCount).toBe(2);
      expect(after.updatedAt).toBe(article.updatedAt);
    });
  });

  describe('xoá', () => {
    it('xoá được bài viết', () => {
      const article = articles.create(draft());
      articles.remove(article.id);

      expect(articles.findOne(article.id)).toBeNull();
    });

    it('không xoá được chuyên mục đang có bài', () => {
      const category = articleCategories.category()!;
      articles.create(draft());

      expect(() => details.remove(category.id, tinNoiBo)).toThrow(
        /đang có 1 bài viết/,
      );
    });

    it('xoá hết bài thì xoá được chuyên mục', () => {
      const category = articleCategories.category()!;
      const article = articles.create(draft());
      articles.remove(article.id);

      expect(() => details.remove(category.id, tinNoiBo)).not.toThrow();
    });
  });
});
