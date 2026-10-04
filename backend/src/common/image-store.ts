import {
  BadRequestException,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { createReadStream, existsSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { resolveInsideDir } from '../contacts/attachments';
import { uploadDir } from './upload-dir';

/**
 * Kho ảnh công khai dùng chung: ảnh trong bài viết, ảnh sản phẩm.
 *
 * Mỗi loại một thư mục con của `UPLOAD_DIR` (mặc định `data/uploads`), giống
 * đính kèm liên hệ.
 */

/** 5MB như đính kèm liên hệ, thừa cho ảnh web. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const INVALID_IMAGE = 'Ảnh không hợp lệ. Chỉ nhận JPG, PNG, GIF, WebP.';

/**
 * Chỉ ảnh raster. SVG cố ý bị loại (xem contacts/attachments.ts): ảnh được
 * phục vụ công khai trên tên miền chính, SVG có `<script>` là XSS ngay.
 */
const IMAGE_TYPES: Record<
  string,
  { ext: string; magic: (b: Buffer) => boolean }
> = {
  'image/jpeg': {
    ext: '.jpg',
    magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/png': {
    ext: '.png',
    magic: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  'image/gif': {
    ext: '.gif',
    magic: (b) => b.subarray(0, 6).toString('latin1').startsWith('GIF8'),
  },
  'image/webp': {
    ext: '.webp',
    magic: (b) =>
      b.subarray(0, 4).toString('latin1') === 'RIFF' &&
      b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};

export const IMAGE_MIME_TYPES = Object.keys(IMAGE_TYPES);

/** Tên file do mình sinh: uuid + đuôi ảnh. Thứ gì khác đều không hợp lệ. */
const FILE_NAME = /^[0-9a-f-]{36}\.(jpg|png|gif|webp)$/;

const MIME_BY_EXT: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGE_TYPES).map(([mime, { ext }]) => [ext, mime]),
);

export type UploadedImage = {
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/** Lọc sớm ở multer: sai kiểu thì không đọc tệp vào bộ nhớ. */
export const IMAGE_UPLOAD_OPTIONS = {
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, accept: boolean) => void,
  ) => {
    if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(new BadRequestException(INVALID_IMAGE), false);
      return;
    }
    cb(null, true);
  },
};

/** Header cho ảnh công khai: tên là uuid, nội dung không bao giờ đổi. */
export const PUBLIC_IMAGE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

export abstract class ImageStore {
  protected constructor(
    private readonly config: ConfigService,
    /** Thư mục con trong `UPLOAD_DIR`. */
    private readonly folder: string,
  ) {}

  private uploadDir(): string {
    return uploadDir(this.config, this.folder);
  }

  /**
   * Lưu ảnh, trả về tên file. Kiểm tra cả chữ ký byte đầu tệp chứ không chỉ
   * tin `Content-Type` trình duyệt khai: ảnh này sẽ được phát công khai, một
   * tệp HTML đội lốt `image/png` là không được phép lọt qua.
   */
  save(file: UploadedImage | undefined): string {
    if (!file) throw new BadRequestException('Chưa chọn ảnh để tải lên');

    const type = IMAGE_TYPES[file.mimetype];
    if (!type || !type.magic(file.buffer)) {
      throw new BadRequestException(INVALID_IMAGE);
    }

    const name = `${randomUUID()}${type.ext}`;
    writeFileSync(resolveInsideDir(this.uploadDir(), name), file.buffer);
    return name;
  }

  /** Đường dẫn trên đĩa và kiểu MIME của một ảnh đã lưu. */
  locate(name: string): { path: string; mime: string } {
    if (!FILE_NAME.test(name)) throw new NotFoundException('Không có ảnh này');

    const full = resolveInsideDir(this.uploadDir(), name);
    if (!existsSync(full)) throw new NotFoundException('Không có ảnh này');

    return { path: full, mime: MIME_BY_EXT[path.extname(name)] };
  }

  /** Phát ảnh ra response; header cache/nosniff do controller đặt. */
  stream(name: string, res: Response): StreamableFile {
    const file = this.locate(name);
    res.set({
      'Content-Type': file.mime,
      'Content-Length': String(statSync(file.path).size),
    });
    return new StreamableFile(createReadStream(file.path));
  }
}
