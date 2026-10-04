import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ImageStore } from '../common/image-store';

/** Ảnh chèn trong nội dung bài và ảnh bìa — `data/uploads/articles`. */
@Injectable()
export class ArticleImagesService extends ImageStore {
  constructor(config: ConfigService) {
    super(config, 'articles');
  }
}
