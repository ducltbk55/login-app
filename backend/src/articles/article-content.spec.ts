import {
  isBlankArticleHtml,
  normalizeArticleContent,
  sanitizeArticleHtml,
  textOfHtml,
} from './article-content';

describe('article-content', () => {
  describe('sanitizeArticleHtml', () => {
    it('giữ nguyên định dạng CKEditor sinh ra', () => {
      const html =
        '<h2 style="text-align:center;">Tiêu đề</h2>' +
        '<p><strong>Đậm</strong> <i>nghiêng</i> <u>gạch</u></p>' +
        '<ul><li>Một</li></ul>' +
        '<figure class="image image-style-align-left image_resized" style="width:50%;">' +
        '<img style="aspect-ratio:1200/800;" src="/media/articles/a.jpg" alt="Ảnh" width="1200" height="800">' +
        '<figcaption>Chú thích</figcaption></figure>' +
        '<figure class="table"><table><tbody><tr><td colspan="2">Ô</td></tr></tbody></table></figure>';

      // Chỉ khác cách viết: bỏ ';' cuối style, <img> tự đóng.
      expect(sanitizeArticleHtml(html)).toBe(
        html.replace(/;"/g, '"').replace('height="800">', 'height="800" />'),
      );
    });

    it('bỏ script, event handler và javascript: URL', () => {
      const html = sanitizeArticleHtml(
        '<p onclick="alert(1)">Chữ</p><script>alert(1)</script>' +
          '<a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">' +
          '<iframe src="https://evil.example"></iframe>',
      );

      expect(html).not.toMatch(/script|onclick|onerror|javascript:|iframe/i);
      expect(html).toContain('<p>Chữ</p>');
    });

    it('chỉ giữ thuộc tính CSS được phép', () => {
      expect(
        sanitizeArticleHtml(
          '<p style="text-align:right;position:fixed;background:url(x)">a</p>',
        ),
      ).toBe('<p style="text-align:right">a</p>');
    });

    it('link mở tab mới luôn có rel noopener', () => {
      expect(
        sanitizeArticleHtml('<a href="https://x.vn" target="_blank">x</a>'),
      ).toBe(
        '<a href="https://x.vn" target="_blank" rel="noopener noreferrer">x</a>',
      );
    });

    it('không nhận ảnh data: hay class lạ', () => {
      expect(
        sanitizeArticleHtml(
          '<figure class="image evil"><img src="data:image/png;base64,AA"></figure>',
        ),
      ).toBe('<figure class="image"><img /></figure>');
    });
  });

  describe('normalizeArticleContent', () => {
    it('đổi chữ thô kiểu cũ sang đoạn văn, có escape', () => {
      expect(normalizeArticleContent('Đoạn 1\ndòng 2\n\nĐoạn <b>2</b>')).toBe(
        '<p>Đoạn 1<br>dòng 2</p><p>Đoạn &lt;b&gt;2&lt;/b&gt;</p>',
      );
    });

    it('HTML thì lọc lại', () => {
      expect(normalizeArticleContent('<p>a</p><script>x</script>')).toBe(
        '<p>a</p>',
      );
    });
  });

  it('textOfHtml tách chữ giữa các khối và giải mã ký tự', () => {
    expect(textOfHtml('<p>Một&nbsp;hai</p><p>A &amp; B</p>')).toBe(
      'Một hai A & B',
    );
  });

  it('isBlankArticleHtml', () => {
    expect(isBlankArticleHtml('<p>&nbsp;</p>')).toBe(true);
    expect(
      isBlankArticleHtml('<figure class="image"><img src="/a.jpg"></figure>'),
    ).toBe(false);
    expect(isBlankArticleHtml('<p>a</p>')).toBe(false);
  });
});
