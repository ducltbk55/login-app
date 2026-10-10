import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
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
import { createReadStream, statSync } from 'node:fs';

import { ApiKeyGuard } from '../common/api-key.guard';
import { paginate, type Paginated } from '../common/pagination';
import {
  contentDisposition,
  isAllowedMime,
  isInlineSafe,
  ALLOWED_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
} from './attachments';
import type { Contact, ContactStats } from './contact.entity';
import { ContactsService, type UploadedAttachment } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsDto } from './dto/list-contacts.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

/** multer không có @types nên khai báo đúng phần mình dùng. */
type MulterFile = UploadedAttachment;
type FileFilterCallback = (error: Error | null, accept: boolean) => void;

/**
 * Chặn ngay từ lúc nhận: kiểu không nằm trong allowlist thì multer bỏ qua
 * luôn, không tốn công đọc hết tệp vào bộ nhớ.
 */
const ATTACHMENT_OPTIONS = {
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: FileFilterCallback,
  ) => {
    if (!isAllowedMime(file.mimetype)) {
      cb(
        new BadRequestException(
          `Định dạng tệp không được hỗ trợ. Chỉ nhận: ${ALLOWED_EXTENSIONS}`,
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};

@Controller('contacts')
@UseGuards(ApiKeyGuard)
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  async list(@Query() query: ListContactsDto): Promise<Paginated<Contact>> {
    return paginate(await this.contacts.list(query), query);
  }

  @Get('stats')
  stats(): Promise<ContactStats> {
    return this.contacts.stats();
  }

  /**
   * Nhận form từ trang Liên hệ. `attachment` là tuỳ chọn.
   *
   * Không trả lại bản ghi vừa tạo: người gửi không cần id, và endpoint này là
   * đường vào công khai nhất của hệ thống nên trả về càng ít càng tốt.
   */
  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('attachment', ATTACHMENT_OPTIONS))
  async create(
    @Body() dto: CreateContactDto,
    @UploadedFile() file?: MulterFile,
  ): Promise<{ ok: true }> {
    await this.contacts.create(dto, file);
    return { ok: true };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Contact> {
    return this.contacts.findOneOrFail(id);
  }

  /**
   * Trả tệp đính kèm. Ảnh và PDF mở thẳng trong trình duyệt được, phần còn lại
   * buộc tải về. `nosniff` để trình duyệt không tự đoán kiểu rồi chạy nhầm thứ
   * gì đó — kiểu nào thì mình đã chốt từ lúc nhận.
   */
  @Get(':id/attachment')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  async attachment(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.contacts.attachmentPath(id);

    res.set({
      'Content-Type': file.mime,
      'Content-Length': String(statSync(file.path).size),
      'Content-Disposition': contentDisposition(
        file.name,
        isInlineSafe(file.mime),
      ),
    });

    return new StreamableFile(createReadStream(file.path));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContactDto,
  ): Promise<Contact> {
    return this.contacts.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.contacts.remove(id);
  }
}
