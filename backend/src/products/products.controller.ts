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
  async list(@Query() query: ListProductsDto): Promise<Paginated<Product>> {
    return paginate(await this.products.list(query), query);
  }

  /**
   * Lĩnh vực đang bật, kèm số sản phẩm. Endpoint riêng để frontend khỏi phải
   * biết mã DM_LINH_VUC_SP rồi gọi hai vòng.
   */
  @Get('categories')
  async listCategories(@Query('live') live?: string): Promise<
    {
      id: number;
      code: string;
      name: string;
      productCount: number;
    }[]
  > {
    const counts = await this.products.countsByCategory(
      live === 'true' || live === '1',
    );
    return (await this.categories.list()).map((detail) => ({
      id: detail.id,
      code: detail.code,
      name: detail.name,
      productCount: counts[detail.id] ?? 0,
    }));
  }

  /** Đặt trước `:id` — Nest khớp route theo thứ tự khai báo. */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Product> {
    const product = await this.products.findBySlug(slug);
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
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Product> {
    return this.products.findOneOrFail(id);
  }

  @Post()
  async create(@Body() dto: CreateProductDto): Promise<Product> {
    return this.products.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.products.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.products.remove(id);
  }
}
