import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { ApiKeyGuard } from '../common/api-key.guard';
import {
  IMAGE_UPLOAD_OPTIONS,
  PUBLIC_IMAGE_HEADERS,
  type UploadedImage,
} from '../common/image-store';
import { paginate, type Paginated } from '../common/pagination';
import { ListProductsDto } from './dto/list-products.dto';
import { CreateProductDto, UpdateProductDto } from './dto/save-product.dto';
import { ProductCategoriesService } from './product-categories.service';
import { ProductImagesService } from './product-images.service';
import type { Product } from './product.entity';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(ApiKeyGuard)
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly categories: ProductCategoriesService,
    private readonly images: ProductImagesService,
  ) {}

  @Get()
  list(@Query() query: ListProductsDto): Paginated<Product> {
    return paginate(this.products.list(query), query);
  }

  /**
   * Lĩnh vực đang bật, kèm số sản phẩm. Endpoint riêng để frontend khỏi phải
   * biết mã DM_LINH_VUC_SP rồi gọi hai vòng.
   */
  @Get('categories')
  listCategories(@Query('live') live?: string): {
    id: number;
    code: string;
    name: string;
    productCount: number;
  }[] {
    const counts = this.products.countsByCategory(
      live === 'true' || live === '1',
    );
    return this.categories.list().map((detail) => ({
      id: detail.id,
      code: detail.code,
      name: detail.name,
      productCount: counts[detail.id] ?? 0,
    }));
  }

  /** Đặt trước `:id` — Nest khớp route theo thứ tự khai báo. */
  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string): Product {
    const product = this.products.findBySlug(slug);
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm "${slug}"`);
    }
    return product;
  }

  /** Ảnh sản phẩm hoặc ảnh chèn trong mô tả. Trả về tên file. */
  @Post('images')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('upload', IMAGE_UPLOAD_OPTIONS))
  uploadImage(@UploadedFile() file?: UploadedImage): { file: string } {
    return { file: this.images.save(file) };
  }

  @Get('images/:file')
  image(
    @Param('file') name: string,
    @Res({ passthrough: true }) res: Response,
  ): StreamableFile {
    res.set(PUBLIC_IMAGE_HEADERS);
    return this.images.stream(name, res);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Product {
    return this.products.findOneOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateProductDto): Product {
    return this.products.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Product {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.products.remove(id);
  }
}
