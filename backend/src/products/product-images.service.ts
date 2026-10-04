import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ImageStore } from '../common/image-store';

/** Ảnh đại diện và ảnh trong mô tả sản phẩm — `<UPLOAD_DIR>/products`. */
@Injectable()
export class ProductImagesService extends ImageStore {
  constructor(config: ConfigService) {
    super(config, 'products');
  }
}
