import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rmSync, writeFileSync } from 'node:fs';

import {
  resolveInsideDir,
  safeDisplayName,
  storageName,
} from '../contacts/attachments';
import { matchesSearch } from '../common/search';
import {
  candidateEmailKindFor,
  type CandidateEmailKind,
  type CandidateEmailOptions,
} from '../mail/candidate-email.templates';
import { uploadDir } from '../common/upload-dir';
import { DatabaseService } from '../database/database.service';
import { CandidateMailer } from './candidate-mailer';
import { assertCvContent } from './cv';
import { ListCandidatesDto } from './dto/list.dto';
import {
  CreateCandidateDto,
  UpdateCandidateDto,
} from './dto/save-candidate.dto';
import { JobsService } from './jobs.service';
import type {
  Candidate,
  CandidateDetail,
  CandidateEvent,
  CandidateEventType,
  CandidateStats,
  CandidateStatus,
} from './recruitment.entity';

type CandidateRow = {
  id: number;
  jobId: number;
  batchId: number;
  fullName: string;
  email: string;
  phone: string;
  experience: string | null;
  portfolioUrl: string | null;
  coverLetter: string | null;
  cvName: string;
  cvFile: string;
  cvMime: string;
  cvSize: number;
  status: string;
  interviewAt: string | null;
  note: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
  jobSlug: string;
  jobTitle: string;
  batchName: string;
};

type EventRow = {
  id: number;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  actor: string | null;
  createdAt: string;
};

/** Tệp đã nhận từ multer, rút gọn về đúng phần cần dùng. */
export type UploadedCv = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function toCandidate(row: CandidateRow): Candidate {
  return {
    id: Number(row.id),
    jobId: Number(row.jobId),
    batchId: Number(row.batchId),
    job: { id: Number(row.jobId), slug: row.jobSlug, title: row.jobTitle },
    batch: { id: Number(row.batchId), name: row.batchName },
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    experience: row.experience,
    portfolioUrl: row.portfolioUrl,
    coverLetter: row.coverLetter,
    cv: {
      name: row.cvName,
      mime: row.cvMime,
      size: Number(row.cvSize),
      // Chỉ PDF mở xem trong trình duyệt; Word luôn tải về.
      inline: row.cvMime === 'application/pdf',
    },
    status: row.status as CandidateStatus,
    interviewAt: row.interviewAt,
    note: row.note,
    handledBy: row.handledBy,
    handledAt: row.handledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly jobs: JobsService,
    private readonly mailer: CandidateMailer,
  ) {}

  /**
   * CV nằm trong `UPLOAD_DIR/candidates`, ngoài mọi thư mục tĩnh: đây là dữ
   * liệu cá nhân, chỉ người có quyền mới tải được qua endpoint có kiểm soát.
   */
  private uploadDir(): string {
    return uploadDir(this.config, 'candidates');
  }

  private selectAll(): string {
    return `SELECT c.*, j.slug AS jobSlug, j.title AS jobTitle, b.name AS batchName
         FROM candidates c
         JOIN recruitment_jobs j ON j.id = c.jobId
         JOIN recruitment_batches b ON b.id = c.batchId`;
  }

  async list(query: ListCandidatesDto = {}): Promise<Candidate[]> {
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (query.status !== undefined) {
      where.push('c.status = ?');
      params.push(query.status);
    }
    if (query.batchId !== undefined) {
      where.push('c.batchId = ?');
      params.push(query.batchId);
    }
    if (query.jobId !== undefined) {
      where.push('c.jobId = ?');
      params.push(query.jobId);
    }

    const rows = await this.db.all<CandidateRow>(
      `${this.selectAll()}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.createdAt DESC, c.id DESC`,
      params,
    );

    const items = rows.map(toCandidate);
    if (!query.search) return items;
    return items.filter((candidate) =>
      matchesSearch(
        query.search ?? '',
        candidate.fullName,
        candidate.email,
        candidate.phone,
        candidate.job.title,
      ),
    );
  }

  async findOne(id: number): Promise<CandidateDetail | null> {
    const row = await this.db.get<CandidateRow>(
      `${this.selectAll()} WHERE c.id = ?`,
      [id],
    );
    if (!row) return null;

    const events = await this.db.all<EventRow>(
      `SELECT id, type, fromValue, toValue, actor, createdAt
         FROM candidate_events WHERE candidateId = ?
        ORDER BY createdAt DESC, id DESC`,
      [id],
    );

    return {
      ...toCandidate(row),
      events: events.map((event): CandidateEvent => ({
        id: Number(event.id),
        type: event.type as CandidateEventType,
        fromValue: event.fromValue,
        toValue: event.toValue,
        actor: event.actor,
        createdAt: event.createdAt,
      })),
    };
  }

  async findOneOrFail(id: number): Promise<CandidateDetail> {
    const candidate = await this.findOne(id);
    if (!candidate) {
      throw new NotFoundException(`Không tìm thấy ứng viên ${id}`);
    }
    return candidate;
  }

  /** Đếm theo trạng thái; lọc được theo đợt để xem tiến độ từng đợt. */
  async stats(batchId?: number): Promise<CandidateStats> {
    const rows = await this.db.all<{ status: string; total: number }>(
      `SELECT status, COUNT(*) AS total FROM candidates
       ${batchId !== undefined ? 'WHERE batchId = ?' : ''}
       GROUP BY status`,
      batchId !== undefined ? [batchId] : [],
    );
    const by = (status: CandidateStatus) =>
      Number(rows.find((row) => row.status === status)?.total ?? 0);

    return {
      total: rows.reduce((sum, row) => sum + Number(row.total), 0),
      pending: by('new'),
      interview: by('interview'),
      hired: by('hired'),
    };
  }

  /** Nộp hồ sơ từ trang ngoài. CV là bắt buộc. */
  async create(dto: CreateCandidateDto, file?: UploadedCv): Promise<void> {
    if (!file) throw new BadRequestException('Vui lòng đính kèm CV');
    assertCvContent(file);

    const job = await this.jobs.findOne(dto.jobId);
    if (!job) throw new BadRequestException('Vị trí ứng tuyển không tồn tại');
    if (!job.accepting) {
      throw new BadRequestException('Vị trí này đã ngừng nhận hồ sơ');
    }

    const duplicate = await this.db.get<{ id: number }>(
      'SELECT id FROM candidates WHERE jobId = ? AND email = ? LIMIT 1',
      [job.id, dto.email],
    );
    if (duplicate) {
      throw new ConflictException(
        'Email này đã nộp hồ sơ cho vị trí này rồi. Chúng tôi sẽ liên hệ khi có kết quả.',
      );
    }

    // Ghi file TRƯỚC khi insert, hỏng thì xoá — như đính kèm liên hệ.
    const fileName = storageName(file.mimetype);
    writeFileSync(resolveInsideDir(this.uploadDir(), fileName), file.buffer);

    let id: number;
    try {
      id = await this.db.transaction(async () => {
        const now = new Date().toISOString();
        const result = await this.db.run(
          `INSERT INTO candidates
             (jobId, batchId, fullName, email, phone, experience, portfolioUrl,
              coverLetter, cvName, cvFile, cvMime, cvSize, status,
              createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
          [
            job.id,
            job.batchId,
            dto.fullName,
            dto.email,
            dto.phone,
            dto.experience ?? null,
            dto.portfolioUrl ?? null,
            dto.coverLetter ?? null,
            safeDisplayName(file.originalname),
            fileName,
            file.mimetype,
            file.size,
            now,
            now,
          ],
        );
        await this.logEvent(result.lastInsertId, 'created', null, 'new', null);
        return result.lastInsertId;
      });
    } catch (error) {
      this.removeFile(fileName);
      throw error;
    }

    // Thư xác nhận luôn gửi: chính ứng viên vừa bấm nộp, họ chờ nó. Gửi sau
    // khi commit và không chờ — SMTP chậm không được làm treo form nộp hồ sơ.
    void this.sendEmail(id, 'received', {}, null);
  }

  async update(id: number, dto: UpdateCandidateDto): Promise<CandidateDetail> {
    const { candidate, email } = await this.db.transaction(async () => {
      const current = await this.findOneOrFail(id);
      const now = new Date().toISOString();
      const actor = dto.handledBy ?? null;

      const status = dto.status ?? current.status;
      const statusChanged = status !== current.status;
      const interviewAt =
        dto.interviewAt !== undefined
          ? dto.interviewAt && new Date(dto.interviewAt).toISOString()
          : current.interviewAt;

      await this.db.run(
        `UPDATE candidates
            SET status = ?, interviewAt = ?, note = ?,
                handledBy = ?, handledAt = ?, updatedAt = ?
          WHERE id = ?`,
        [
          status,
          interviewAt,
          dto.note !== undefined ? dto.note : current.note,
          // "Ai xử lý lúc nào" chỉ đổi khi trạng thái đổi — sửa ghi chú không tính.
          statusChanged ? actor : current.handledBy,
          statusChanged ? now : current.handledAt,
          now,
          id,
        ],
      );

      if (statusChanged) {
        await this.logEvent(id, 'status', current.status, status, actor);
      }
      const interviewChanged = interviewAt !== current.interviewAt;
      if (interviewChanged) {
        await this.logEvent(
          id,
          'interview',
          current.interviewAt,
          interviewAt,
          actor,
        );
      }

      // Email nào (nếu có): đổi bước thì theo bước mới; vẫn ở Phỏng vấn mà
      // đổi lịch thì gửi thư "cập nhật lịch". Không `notify` thì không gửi gì.
      let email: { kind: CandidateEmailKind; rescheduled: boolean } | null =
        null;
      if (dto.notify) {
        const kind = statusChanged ? candidateEmailKindFor(status) : null;
        if (kind) {
          email = { kind, rescheduled: false };
        } else if (
          !statusChanged &&
          status === 'interview' &&
          interviewChanged &&
          interviewAt
        ) {
          email = { kind: 'interview', rescheduled: true };
        }
      }

      return { candidate: await this.findOneOrFail(id), email };
    });

    if (email) {
      void this.sendEmail(
        id,
        email.kind,
        { message: dto.message, rescheduled: email.rescheduled },
        dto.handledBy ?? null,
      );
    }
    return candidate;
  }

  /**
   * Gửi email cho ứng viên rồi ghi kết quả vào nhật ký hồ sơ. Không bao giờ
   * ném lỗi — được gọi kiểu "bắn rồi quên" sau khi dữ liệu đã lưu.
   */
  private async sendEmail(
    id: number,
    kind: CandidateEmailKind,
    options: CandidateEmailOptions,
    actor: string | null,
  ): Promise<void> {
    try {
      const candidate = await this.findOneOrFail(id);
      const result = await this.mailer.send(candidate, kind, options);
      await this.logEvent(id, 'email', result, kind, actor);
    } catch (error) {
      this.logger.error(
        `Không gửi được email "${kind}" cho ứng viên ${id}: ${String(error)}`,
      );
    }
  }

  async remove(id: number): Promise<void> {
    const candidate = await this.findOneOrFail(id);
    const row = await this.db.get<{ cvFile: string }>(
      'SELECT cvFile FROM candidates WHERE id = ?',
      [id],
    );

    await this.db.run('DELETE FROM candidates WHERE id = ?', [id]);
    // Xoá bản ghi rồi mới xoá tệp: tệp mồ côi vô hại, bản ghi mất tệp thì không.
    if (row?.cvFile) this.removeFile(row.cvFile);
    this.logger.log(`Đã xoá hồ sơ ứng viên ${id} (${candidate.email})`);
  }

  /** Đường dẫn tuyệt đối tới CV, để controller stream về. */
  async cvPath(
    id: number,
  ): Promise<{ path: string; name: string; mime: string }> {
    const row = await this.db.get<{
      cvFile: string;
      cvName: string;
      cvMime: string;
    }>('SELECT cvFile, cvName, cvMime FROM candidates WHERE id = ?', [id]);
    if (!row) throw new NotFoundException(`Không tìm thấy ứng viên ${id}`);

    return {
      path: resolveInsideDir(this.uploadDir(), row.cvFile),
      name: row.cvName,
      mime: row.cvMime,
    };
  }

  private async logEvent(
    candidateId: number,
    type: CandidateEventType,
    fromValue: string | null,
    toValue: string | null,
    actor: string | null,
  ): Promise<void> {
    await this.db.run(
      `INSERT INTO candidate_events
         (candidateId, type, fromValue, toValue, actor, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [candidateId, type, fromValue, toValue, actor, new Date().toISOString()],
    );
  }

  private removeFile(fileName: string): void {
    try {
      rmSync(resolveInsideDir(this.uploadDir(), fileName), { force: true });
    } catch (error) {
      this.logger.warn(`Không xoá được CV ${fileName}: ${String(error)}`);
    }
  }
}
