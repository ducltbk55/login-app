import sanitizeHtml from 'sanitize-html';

/**
 * Nội dung bài viết là HTML do CKEditor sinh ra.
 *
 * Không tin HTML gửi lên chỉ vì nó "đến từ trình soạn thảo": ai cầm được khoá
 * nội bộ hay một phiên admin là gửi thẳng request được, và trang ngoài render
 * nội dung này bằng `dangerouslySetInnerHTML`. Nên backend lọc theo allowlist
 * — chỉ giữ đúng những thẻ/thuộc tính mà thanh công cụ của editor tạo ra được.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'p',
    'br',
    'h2',
    'h3',
    'h4',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'sub',
    'sup',
    'code',
    'pre',
    'mark',
    'span',
    'a',
    'ul',
    'ol',
    'li',
    'blockquote',
    'hr',
    'figure',
    'figcaption',
    'img',
    'picture',
    'source',
    'table',
    'colgroup',
    'col',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'th',
    'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'width', 'height', 'style', 'class'],
    source: ['srcset', 'type', 'sizes'],
    figure: ['class', 'style'],
    table: ['class', 'style'],
    col: ['style', 'span'],
    th: ['colspan', 'rowspan', 'style', 'scope'],
    td: ['colspan', 'rowspan', 'style'],
    ol: ['start', 'reversed', 'style'],
    ul: ['style'],
    li: ['style'],
    p: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
    pre: ['class'],
    code: ['class'],
    mark: ['class'],
    span: ['class', 'style'],
  },
  // Class do CKEditor đặt cho căn ảnh, cỡ ảnh, bảng, highlight, code block.
  allowedClasses: {
    figure: [
      'image',
      'image_resized',
      'image-style-side',
      'image-style-align-left',
      'image-style-align-right',
      'image-style-align-center',
      'image-style-block-align-left',
      'image-style-block-align-right',
      'image-inline',
      'table',
    ],
    img: ['image_resized', 'image-style-align-left', 'image-style-align-right'],
    table: ['table'],
    pre: ['language-*'],
    code: ['language-*'],
    mark: [
      'marker-yellow',
      'marker-green',
      'marker-pink',
      'marker-blue',
      'pen-red',
      'pen-green',
    ],
    span: ['text-tiny', 'text-small', 'text-big', 'text-huge'],
  },
  // Chỉ những thuộc tính CSS editor dùng, và giá trị phải đúng dạng — chặn
  // `background:url(...)`, `position:fixed` phủ kín trang, v.v.
  allowedStyles: {
    '*': {
      'text-align': [/^(left|right|center|justify)$/],
      'margin-left': [/^\d+(\.\d+)?(px|em|%)$/],
    },
    img: {
      width: [/^\d+(\.\d+)?(px|%)$/],
      'aspect-ratio': [/^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/],
    },
    figure: { width: [/^\d+(\.\d+)?(px|%)$/] },
    table: { width: [/^\d+(\.\d+)?(px|%)$/] },
    col: { width: [/^\d+(\.\d+)?(px|%)$/] },
    td: { width: [/^\d+(\.\d+)?(px|%)$/] },
    th: { width: [/^\d+(\.\d+)?(px|%)$/] },
    ol: { 'list-style-type': [/^[a-z-]+$/] },
    ul: { 'list-style-type': [/^[a-z-]+$/] },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    // Link mở tab mới luôn kèm noopener để trang đích không với tay được
    // về `window.opener` của trang mình.
    a: (tagName, attribs) => {
      const attrs = { ...attribs };
      if (attrs.target === '_blank') {
        attrs.rel = 'noopener noreferrer';
      } else {
        delete attrs.target;
        delete attrs.rel;
      }
      return { tagName, attribs: attrs };
    },
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS).trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Bài soạn trước khi có CKEditor lưu chữ thô, mỗi đoạn cách nhau một dòng
 * trống. Nhận ra chúng bằng việc không mở đầu bằng thẻ HTML — CKEditor luôn
 * bọc nội dung trong một thẻ khối.
 */
function isLegacyPlainText(content: string): boolean {
  return !/^\s*</.test(content);
}

/** Chữ thô kiểu cũ → HTML tương đương, giữ nguyên cách tách đoạn và xuống dòng. */
function plainTextToHtml(content: string): string {
  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Chuẩn hoá nội dung đọc từ DB: bài cũ đổi sang HTML, bài mới lọc lại lần
 * nữa. Lọc cả lúc đọc để một dòng bị ghi thẳng vào DB (script, sửa tay) cũng
 * không lọt được mã chạy ra trang ngoài.
 */
export function normalizeArticleContent(content: string): string {
  return isLegacyPlainText(content)
    ? plainTextToHtml(content)
    : sanitizeArticleHtml(content);
}

/** Chữ thuần của nội dung HTML — để đếm từ, tìm kiếm, làm đoạn trích. */
export function textOfHtml(html: string): string {
  return sanitizeHtml(
    // Thẻ khối và <br> thành khoảng trắng, kẻo chữ hai đoạn dính vào nhau.
    html.replace(
      /<(br|\/p|\/h\d|\/li|\/td|\/th|\/blockquote|\/figcaption)\b[^>]*>/gi,
      ' $&',
    ),
    { allowedTags: [], allowedAttributes: {} },
  )
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Nội dung "rỗng" theo nghĩa người đọc: không chữ, không ảnh, không bảng. */
export function isBlankArticleHtml(html: string): boolean {
  return textOfHtml(html) === '' && !/<(img|table|hr)\b/i.test(html);
}
