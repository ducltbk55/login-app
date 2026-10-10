import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  isBlankArticleHtml,
  normalizeArticleContent,
  sanitizeArticleHtml,
} from '../articles/article-content';
import { matchesSearch } from '../common/search';
import { slugify } from '../common/slugify';
import { DatabaseService } from '../database/database.service';
import { ListJobsDto } from './dto/list.dto';
import { CreateJobDto, UpdateJobDto } from './dto/save-job.dto';
import {
  isBatchAccepting,
  todayInVietnam,
  type BatchStatus,
  type Job,
  type JobStatus,
} from './recruitment.entity';

type JobRow = {
  id: number;
  batchId: number;
  slug: string;
  title: string;
  department: string | null;
  level: string;
  employmentType: string;
  location: string;
  salary: string | null;
  openings: number;
  summary: string | null;
  requirements: string | null;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  batchName: string;
  batchDescription: string | null;
  batchStatus: string;
  batchStartDate: string;
  batchEndDate: string;
  candidateCount: number;
};

/** Ô nhập "mỗi dòng một yêu cầu" → mảng, bỏ dòng trống và gạch đầu dòng gõ tay. */
function splitLines(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter(Boolean);
}

function toJob(row: JobRow, today: string): Job {
  const batch = {
    id: Number(row.batchId),
    name: row.batchName,
    description: row.batchDescription,
    status: row.batchStatus as BatchStatus,
    startDate: row.batchStartDate,
    endDate: row.batchEndDate,
  };
  const batchAccepting = isBatchAccepting(batch, today);

  return {
    id: Number(row.id),
    batchId: batch.id,
    batch: { ...batch, accepting: batchAccepting },
    slug: row.slug,
    title: row.title,
    department: row.department,
    level: row.level,
    employmentType: row.employmentType,
    location: row.location,
    salary: row.salary,
    openings: Number(row.openings),
    summary: row.summary,
    requirements: splitLines(row.requirements),
    description: normalizeArticleContent(row.description),
    status: row.status as JobStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    candidateCount: Number(row.candidateCount ?? 0),
    accepting: row.status === 'open' && batchAccepting,
  };
}

@Injectable()
export class JobsService {
  constructor(private readonly db: DatabaseService) {}

  private selectAll(): string {
    return `SELECT j.*,
              b.name AS batchName, b.description AS batchDescription, b.status AS batchStatus,
              b.startDate AS batchStartDate, b.endDate AS batchEndDate,
              (SELECT COUNT(*) FROM candidates c WHERE c.jobId = j.id) AS candidateCount
         FROM recruitment_jobs j
         JOIN recruitment_batches b ON b.id = j.batchId`;
  }

  async list(query: ListJobsDto = {}): Promise<Job[]> {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (query.batchId !== undefined) {
      where.push('j.batchId = ?');
      params.push(query.batchId);
    }
    if (query.status !== undefined) {
      where.push('j.status = ?');
      params.push(query.status);
    }

    const today = todayInVietnam();
    if (query.accepting) {
      // Cùng điều kiện với `isBatchAccepting`, đẩy xuống SQL cho đỡ đọc thừa.
      where.push(
        "j.status = 'open' AND b.status = 'open' AND b.startDate <= ? AND b.endDate >= ?",
      );
      params.push(today, today);
    }

    const rows = await this.db.all<JobRow>(
      `${this.selectAll()}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY b.startDate DESC, j.createdAt ASC, j.id ASC`,
      params,
    );

    const items = rows.map((row) => toJob(row, today));
    if (!query.search) return items;
    return items.filter((job) =>
      matchesSearch(
        query.search ?? '',
        job.title,
        job.department,
        job.location,
        job.level,
      ),
    );
  }

  async findOne(id: number): Promise<Job | null> {
    const row = await this.db.get<JobRow>(
      `${this.selectAll()} WHERE j.id = ?`,
      [id],
    );
    return row ? toJob(row, todayInVietnam()) : null;
  }

  async findOneOrFail(id: number): Promise<Job> {
    const job = await this.findOne(id);
    if (!job) throw new NotFoundException(`Không tìm thấy vị trí ${id}`);
    return job;
  }

  async findBySlug(slug: string): Promise<Job | null> {
    const row = await this.db.get<JobRow>(
      `${this.selectAll()} WHERE j.slug = ?`,
      [slug],
    );
    return row ? toJob(row, todayInVietnam()) : null;
  }

  async create(dto: CreateJobDto): Promise<Job> {
    return this.db.transaction(async () => {
      await this.assertBatch(dto.batchId);
      const description = this.cleanDescription(dto.description);
      const slug = await this.resolveSlug(dto.slug, dto.title);
      const now = new Date().toISOString();

      const result = await this.db.run(
        `INSERT INTO recruitment_jobs
           (batchId, slug, title, department, level, employmentType, location,
            salary, openings, summary, requirements, description, status,
            createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dto.batchId,
          slug,
          dto.title,
          dto.department ?? null,
          dto.level,
          dto.employmentType,
          dto.location,
          dto.salary ?? null,
          dto.openings,
          dto.summary ?? null,
          dto.requirements ?? null,
          description,
          dto.status ?? 'open',
          now,
          now,
        ],
      );
      return this.findOneOrFail(result.lastInsertId);
    });
  }

  async update(id: number, dto: UpdateJobDto): Promise<Job> {
    return this.db.transaction(async () => {
      const current = await this.findOneOrFail(id);
      if (dto.batchId !== undefined && dto.batchId !== current.batchId) {
        await this.assertBatch(dto.batchId);
      }

      const slug =
        dto.slug === undefined
          ? current.slug
          : await this.resolveSlug(dto.slug, dto.title ?? current.title, id);
      const pick = <K extends keyof UpdateJobDto & keyof Job>(key: K) =>
        dto[key] !== undefined ? dto[key] : current[key];

      await this.db.run(
        `UPDATE recruitment_jobs
            SET batchId = ?, slug = ?, title = ?, department = ?, level = ?,
                employmentType = ?, location = ?, salary = ?, openings = ?,
                summary = ?, requirements = ?, description = ?, status = ?,
                updatedAt = ?
          WHERE id = ?`,
        [
          dto.batchId ?? current.batchId,
          slug,
          dto.title ?? current.title,
          pick('department') ?? null,
          dto.level ?? current.level,
          dto.employmentType ?? current.employmentType,
          dto.location ?? current.location,
          pick('salary') ?? null,
          dto.openings ?? current.openings,
          pick('summary') ?? null,
          dto.requirements !== undefined
            ? dto.requirements
            : current.requirements.join('\n') || null,
          dto.description !== undefined
            ? this.cleanDescription(dto.description)
            : current.description,
          dto.status ?? current.status,
          new Date().toISOString(),
          id,
        ],
      );
      return this.findOneOrFail(id);
    });
  }

  /**
   * Vị trí đã có người nộp thì không xoá được — hồ sơ trỏ về nó. Muốn ngừng
   * nhận thì chuyển sang Tạm dừng.
   */
  async remove(id: number): Promise<void> {
    const job = await this.findOneOrFail(id);
    if (job.candidateCount > 0) {
      throw new ConflictException(
        `Vị trí "${job.title}" đã có ${job.candidateCount} hồ sơ ứng tuyển. Hãy chuyển sang Tạm dừng thay vì xoá.`,
      );
    }
    await this.db.run('DELETE FROM recruitment_jobs WHERE id = ?', [id]);
  }

  private async assertBatch(batchId: number): Promise<void> {
    const row = await this.db.get<{ id: number }>(
      'SELECT id FROM recruitment_batches WHERE id = ?',
      [batchId],
    );
    if (!row) {
      throw new BadRequestException(`Không tìm thấy đợt tuyển dụng ${batchId}`);
    }
  }

  /** Mô tả là HTML từ CKEditor: lọc allowlist như nội dung bài viết. */
  private cleanDescription(html: string): string {
    const clean = sanitizeArticleHtml(html);
    if (isBlankArticleHtml(clean)) {
      throw new BadRequestException('Mô tả công việc không được để trống');
    }
    return clean;
  }

  /** Slug là URL của vị trí; trùng thì nối `-2`, `-3`... như bài viết. */
  private async resolveSlug(
    requested: string | undefined,
    title: string,
    selfId?: number,
  ): Promise<string> {
    const base =
      (requested && slugify(requested)) || slugify(title) || 'vi-tri';

    for (let suffix = 1; ; suffix += 1) {
      const candidate = suffix === 1 ? base : `${base}-${suffix}`;
      const clash = await this.db.get<{ id: number }>(
        'SELECT id FROM recruitment_jobs WHERE slug = ?',
        [candidate],
      );
      if (!clash || (selfId !== undefined && Number(clash.id) === selfId)) {
        return candidate;
      }
    }
  }
}
