import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
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
import { createReadStream, existsSync, statSync } from 'node:fs';

import { ApiKeyGuard } from '../common/api-key.guard';
import { paginate, type Paginated } from '../common/pagination';
import { contentDisposition } from '../contacts/attachments';
import { BatchesService } from './batches.service';
import { CandidatesService, type UploadedCv } from './candidates.service';
import { CV_UPLOAD_OPTIONS } from './cv';
import { ListBatchesDto, ListCandidatesDto, ListJobsDto } from './dto/list.dto';
import { CreateBatchDto, UpdateBatchDto } from './dto/save-batch.dto';
import {
  CreateCandidateDto,
  UpdateCandidateDto,
} from './dto/save-candidate.dto';
import { CreateJobDto, UpdateJobDto } from './dto/save-job.dto';
import { JobsService } from './jobs.service';
import type {
  Batch,
  Candidate,
  CandidateDetail,
  CandidateStats,
  Job,
} from './recruitment.entity';

@Controller('recruitment/batches')
@UseGuards(ApiKeyGuard)
export class BatchesController {
  constructor(private readonly batches: BatchesService) {}

  @Get()
  async list(@Query() query: ListBatchesDto): Promise<Paginated<Batch>> {
    return paginate(await this.batches.list(query), query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Batch> {
    return this.batches.findOneOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateBatchDto): Promise<Batch> {
    return this.batches.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBatchDto,
  ): Promise<Batch> {
    return this.batches.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.batches.remove(id);
  }
}

@Controller('recruitment/jobs')
@UseGuards(ApiKeyGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  async list(@Query() query: ListJobsDto): Promise<Paginated<Job>> {
    return paginate(await this.jobs.list(query), query);
  }

  /** Đặt trước `:id` — Nest khớp route theo thứ tự khai báo. */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string): Promise<Job> {
    const job = await this.jobs.findBySlug(slug);
    if (!job) throw new NotFoundException(`Không tìm thấy vị trí "${slug}"`);
    return job;
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Job> {
    return this.jobs.findOneOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateJobDto): Promise<Job> {
    return this.jobs.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateJobDto,
  ): Promise<Job> {
    return this.jobs.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.jobs.remove(id);
  }
}

@Controller('recruitment/candidates')
@UseGuards(ApiKeyGuard)
export class CandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get()
  async list(@Query() query: ListCandidatesDto): Promise<Paginated<Candidate>> {
    return paginate(await this.candidates.list(query), query);
  }

  @Get('stats')
  stats(
    @Query('batchId', new ParseIntPipe({ optional: true })) batchId?: number,
  ): Promise<CandidateStats> {
    return this.candidates.stats(batchId);
  }

  /**
   * Nộp hồ sơ từ trang ngoài: multipart, CV ở trường `cv`. Như form liên hệ,
   * không trả lại bản ghi — người nộp không cần id.
   */
  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('cv', CV_UPLOAD_OPTIONS))
  async create(
    @Body() dto: CreateCandidateDto,
    @UploadedFile() file?: UploadedCv,
  ): Promise<{ ok: true }> {
    await this.candidates.create(dto, file);
    return { ok: true };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<CandidateDetail> {
    return this.candidates.findOneOrFail(id);
  }

  /**
   * Trả CV. PDF mở xem trong trình duyệt, Word buộc tải về. `nosniff` để
   * trình duyệt không tự đoán kiểu khác với kiểu đã chốt lúc nhận.
   */
  @Get(':id/cv')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Cache-Control', 'private, no-store')
  async cv(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const file = await this.candidates.cvPath(id);
    if (!existsSync(file.path)) {
      throw new NotFoundException('Tệp CV không còn trên máy chủ');
    }

    res.set({
      'Content-Type': file.mime,
      'Content-Length': String(statSync(file.path).size),
      'Content-Disposition': contentDisposition(
        file.name,
        file.mime === 'application/pdf',
      ),
    });
    return new StreamableFile(createReadStream(file.path));
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCandidateDto,
  ): Promise<CandidateDetail> {
    return this.candidates.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.candidates.remove(id);
  }
}
