"use client";

import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  Alignment,
  Autoformat,
  AutoLink,
  BlockQuote,
  Bold,
  ClassicEditor,
  Code,
  CodeBlock,
  Essentials,
  FindAndReplace,
  Heading,
  Highlight,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageTextAlternative,
  ImageToolbar,
  ImageUpload,
  Indent,
  IndentBlock,
  Italic,
  Link,
  LinkImage,
  List,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SimpleUploadAdapter,
  SourceEditing,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableCaption,
  TableColumnResize,
  TableToolbar,
  Underline,
  WordCount,
  type EditorConfig,
} from "ckeditor5";
import translations from "ckeditor5/translations/vi.js";
import { useMemo, useState } from "react";

import "ckeditor5/ckeditor5.css";

/**
 * CKEditor dùng theo giấy phép GPL nếu không khai báo khoá thương mại.
 * Có khoá thì đặt NEXT_PUBLIC_CKEDITOR_LICENSE_KEY trong .env.local.
 */
const LICENSE_KEY = process.env.NEXT_PUBLIC_CKEDITOR_LICENSE_KEY || "GPL";

/**
 * Chỉ bật những tính năng mà bộ lọc HTML ở backend giữ lại được
 * (backend/src/articles/article-content.ts). Thêm plugin mới thì phải nới
 * allowlist bên đó, không thì định dạng sẽ mất ngay khi lưu.
 */
const CONFIG: EditorConfig = {
  licenseKey: LICENSE_KEY,
  language: "vi",
  translations: [translations],
  plugins: [
    Alignment,
    Autoformat,
    AutoLink,
    BlockQuote,
    Bold,
    Code,
    CodeBlock,
    Essentials,
    FindAndReplace,
    Heading,
    Highlight,
    HorizontalLine,
    Image,
    ImageCaption,
    ImageInsert,
    ImageResize,
    ImageStyle,
    ImageTextAlternative,
    ImageToolbar,
    ImageUpload,
    Indent,
    IndentBlock,
    Italic,
    Link,
    LinkImage,
    List,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    SimpleUploadAdapter,
    SourceEditing,
    Strikethrough,
    Subscript,
    Superscript,
    Table,
    TableCaption,
    TableColumnResize,
    TableToolbar,
    Underline,
    WordCount,
  ],
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "|",
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "highlight",
      "removeFormat",
      "|",
      "link",
      "insertImage",
      "insertTable",
      "blockQuote",
      "codeBlock",
      "horizontalLine",
      "|",
      "alignment",
      "bulletedList",
      "numberedList",
      "outdent",
      "indent",
      "|",
      "subscript",
      "superscript",
      "code",
      "|",
      "findAndReplace",
      "sourceEditing",
    ],
    shouldNotGroupWhenFull: false,
  },
  // H1 đã là tiêu đề bài, nên nội dung bắt đầu từ H2.
  heading: {
    options: [
      { model: "paragraph", title: "Đoạn văn", class: "ck-heading_paragraph" },
      {
        model: "heading2",
        view: "h2",
        title: "Tiêu đề 2",
        class: "ck-heading_heading2",
      },
      {
        model: "heading3",
        view: "h3",
        title: "Tiêu đề 3",
        class: "ck-heading_heading3",
      },
      {
        model: "heading4",
        view: "h4",
        title: "Tiêu đề 4",
        class: "ck-heading_heading4",
      },
    ],
  },
  link: {
    defaultProtocol: "https://",
    // Link ra ngoài tự mở tab mới (kèm rel="noopener noreferrer").
    addTargetToExternalLinks: true,
  },
  image: {
    toolbar: [
      "toggleImageCaption",
      "imageTextAlternative",
      "|",
      "imageStyle:inline",
      "imageStyle:wrapText",
      "imageStyle:breakText",
      "|",
      "resizeImage",
      "|",
      "linkImage",
    ],
    upload: { types: ["jpeg", "png", "gif", "webp"] },
    insert: { integrations: ["upload", "url"] },
  },
  table: {
    contentToolbar: [
      "tableColumn",
      "tableRow",
      "mergeTableCells",
      "toggleTableCaption",
    ],
  },
};

/**
 * Ô soạn nội dung bài viết. Giá trị HTML được đẩy vào một input ẩn tên
 * `name`, để form vẫn gửi bằng server action như mọi ô khác.
 *
 * Chỉ chạy phía trình duyệt — nạp qua `next/dynamic` với `ssr: false`.
 */
export default function RichTextEditor({
  name,
  defaultValue = "",
  uploadUrl,
  disabled = false,
}: {
  name: string;
  defaultValue?: string;
  /** Route nhận ảnh dán/kéo vào nội dung, vd. /admin/articles/images. */
  uploadUrl: string;
  /** Chỉ đọc — `<fieldset disabled>` không khoá được vùng soạn của CKEditor. */
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [words, setWords] = useState(0);

  // CKEditor chỉ đọc config lúc khởi tạo; giữ nguyên tham chiếu cho chắc.
  const config = useMemo<EditorConfig>(
    () => ({
      ...CONFIG,
      initialData: defaultValue,
      simpleUpload: { uploadUrl },
      wordCount: { onUpdate: (stats) => setWords(stats.words) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <div className="article-editor">
      <CKEditor
        editor={ClassicEditor}
        config={config}
        disabled={disabled}
        onChange={(_event, editor) => setValue(editor.getData())}
      />
      <input type="hidden" name={name} value={value} />
      <span className="mt-1.5 block text-xs text-admin-muted">
        {words.toLocaleString("vi-VN")} từ · Kéo thả hoặc dán ảnh thẳng vào nội
        dung (JPG, PNG, GIF, WebP, tối đa 5MB).
      </span>
    </div>
  );
}
