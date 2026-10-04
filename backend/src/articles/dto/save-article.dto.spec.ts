import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { UpdateArticleDto } from './save-article.dto';

function coverImageErrors(coverImage: unknown): string[] {
  const dto = plainToInstance(UpdateArticleDto, { coverImage });
  return validateSync(dto)
    .filter((error) => error.property === 'coverImage')
    .flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('SaveArticleDto.coverImage', () => {
  it.each([
    'https://cdn.example.com/anh-bia.jpg',
    'http://example.com/a.png?w=1200',
    '/media/articles/58bd34e7-a580-4112-9654-860852407a23.png',
    '',
  ])('nhận %p', (value) => {
    expect(coverImageErrors(value)).toEqual([]);
  });

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    '/media/articles/../../app.db',
    '/admin/users',
    '//evil.example/a.jpg',
    'https://x.vn/a.jpg" onerror="alert(1)',
  ])('chặn %p', (value) => {
    expect(coverImageErrors(value)).not.toEqual([]);
  });
});
