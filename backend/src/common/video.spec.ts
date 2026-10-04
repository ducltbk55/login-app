import { parseVideoUrl } from './video';

describe('parseVideoUrl', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    ],
    [
      'https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    ],
    [
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    ],
    [
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    ],
    [
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    ],
    [
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      { kind: 'youtube', id: 'dQw4w9WgXcQ' },
    ],
    ['https://vimeo.com/76979871', { kind: 'vimeo', id: '76979871' }],
    [
      'https://player.vimeo.com/video/76979871',
      { kind: 'vimeo', id: '76979871' },
    ],
    [
      'https://cdn.example.com/gioi-thieu.mp4',
      { kind: 'file', src: 'https://cdn.example.com/gioi-thieu.mp4' },
    ],
  ])('nhận %s', (url, expected) => {
    expect(parseVideoUrl(url)).toEqual(expected);
  });

  it.each([
    'javascript:alert(1)',
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ"><script>',
    'https://evil.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ',
    'https://vimeo.com/channels/staffpicks',
    'http://cdn.example.com/a.mp4',
    'https://cdn.example.com/a.avi',
    'không phải link',
  ])('chặn %s', (url) => {
    expect(parseVideoUrl(url)).toBeNull();
  });
});
