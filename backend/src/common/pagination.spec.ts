import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, paginate } from './pagination';

describe('paginate', () => {
  const items = Array.from({ length: 95 }, (_, i) => i + 1);

  it('mặc định trả trang đầu với kích thước mặc định', () => {
    const result = paginate(items);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(DEFAULT_PAGE_SIZE);
    expect(result.total).toBe(95);
    expect(result.totalPages).toBe(Math.ceil(95 / DEFAULT_PAGE_SIZE));
    expect(result.items[0]).toBe(1);
    expect(result.items).toHaveLength(DEFAULT_PAGE_SIZE);
  });

  it('cắt đúng đoạn của trang được yêu cầu', () => {
    const result = paginate(items, { page: 3, pageSize: 10 });

    expect(result.items).toEqual([21, 22, 23, 24, 25, 26, 27, 28, 29, 30]);
    expect(result.totalPages).toBe(10);
  });

  it('trang cuối có thể thiếu phần tử', () => {
    const result = paginate(items, { page: 10, pageSize: 10 });

    expect(result.items).toEqual([91, 92, 93, 94, 95]);
  });

  it('trang vượt quá thì trả trang cuối, không trả rỗng', () => {
    const result = paginate(items, { page: 999, pageSize: 10 });

    expect(result.page).toBe(10);
    expect(result.items).toEqual([91, 92, 93, 94, 95]);
  });

  it('danh sách rỗng vẫn có 1 trang', () => {
    const result = paginate([], { page: 5 });

    expect(result).toMatchObject({ total: 0, page: 1, totalPages: 1 });
    expect(result.items).toEqual([]);
  });

  it('kẹp pageSize trong khoảng cho phép', () => {
    expect(paginate(items, { pageSize: 0 }).pageSize).toBe(1);
    expect(paginate(items, { pageSize: 99999 }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('page nhỏ hơn 1 thì về trang đầu', () => {
    expect(paginate(items, { page: -3, pageSize: 10 }).page).toBe(1);
  });
});
