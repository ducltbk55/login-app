import { BadRequestException } from '@nestjs/common';

/** Bằng giới hạn đính kèm liên hệ — CV vài trang không bao giờ chạm tới. */
export const MAX_CV_BYTES = 5 * 1024 * 1024;

/**
 * CV chỉ nhận PDF và Word. Hẹp hơn hẳn đính kèm liên hệ: ảnh hay file nén
 * không phải CV, và mỗi định dạng mở thêm là thêm một kiểu tệp lạ admin phải
 * mở trên máy mình.
 */
export const CV_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export const CV_EXTENSIONS = 'pdf, doc, docx';

const INVALID_CV = `CV chỉ nhận định dạng ${CV_EXTENSIONS}, tối đa 5MB`;

type FileFilterCallback = (error: Error | null, accept: boolean) => void;

/** Lọc sớm ở multer: sai kiểu thì không đọc tệp vào bộ nhớ. */
export const CV_UPLOAD_OPTIONS = {
  limits: { fileSize: MAX_CV_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: FileFilterCallback,
  ) => {
    if (!CV_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException(INVALID_CV), false);
      return;
    }
    cb(null, true);
  },
};

const PDF_MAGIC = Buffer.from('%PDF-', 'latin1');
/** .doc là OLE2 (Compound File), .docx là zip. */
const OLE2_MAGIC = Buffer.from([
  0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1,
]);
const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Kiểu tệp do trình duyệt khai báo thì ai cũng giả được. Đối chiếu thêm vài
 * byte đầu để một tệp HTML đổi tên thành .pdf không lọt vào rồi được mở
 * thẳng trong trang quản trị.
 */
export function assertCvContent(file: {
  mimetype: string;
  buffer: Buffer;
}): void {
  const head = file.buffer.subarray(0, 8);
  const ok =
    file.mimetype === 'application/pdf'
      ? head.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)
      : file.mimetype === 'application/msword'
        ? head.equals(OLE2_MAGIC)
        : head.subarray(0, ZIP_MAGIC.length).equals(ZIP_MAGIC);

  if (!ok) throw new BadRequestException(INVALID_CV);
}
