import { ConfigService } from '@nestjs/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

/**
 * Thư mục chứa tệp người dùng tải lên (`UPLOAD_DIR`, mặc định `data/uploads`,
 * tương đối so với thư mục backend). Tạo thư mục con nếu chưa có.
 */
export function uploadDir(config: ConfigService, folder: string): string {
  const root = config.get<string>('UPLOAD_DIR') ?? 'data/uploads';
  const absolute = path.isAbsolute(root)
    ? root
    : path.join(process.cwd(), root);

  const dir = path.join(absolute, folder);
  mkdirSync(dir, { recursive: true });
  return dir;
}
