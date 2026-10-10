import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { matchesSearch } from '../common/search';
import { DatabaseService } from '../database/database.service';
import { ListBatchesDto } from './dto/list.dto';
import { CreateBatchDto, UpdateBatchDto } from './dto/save-batch.dto';
import {
  isBatchAccepting,
  todayInVietnam,
  type Batch,
  type BatchStatus,
} from './recruitment.entity';

type BatchRow = {
  id: number;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  jobCount: number;
  candidateCount: number;
};

function toBatch(row: BatchRow, today: string): Batch {
  const batch = {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    startDate: row.startDate,
    endDate: row.endDate,
    status: row.status as BatchStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    jobCount: Number(row.jobCount ?? 0),
    candidateCount: Number(row.candidateCount ?? 0),
  };
  return { ...batch, accepting: isBatchAccepting(batch, today) };
}

/** Ngày lịch có thật không — regex trong DTO vẫn để lọt 2026-02-31. */
function assertRealDate(value: string, label: string): void {
  const date = new Date(`${value}T00:00:00Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new BadRequestException(`${label} không có thật: ${value}`);
  }
}

@Injectable()
export class BatchesService {
  constructor(private readonly db: DatabaseService) {}

  private selectAll(): string {
    return `SELECT b.*,
              (SELECT COUNT(*) FROM recruitment_jobs j WHERE j.batchId = b.id) AS jobCount,
              (SELECT COUNT(*) FROM candidates c WHERE c.batchId = b.id) AS candidateCount
         FROM recruitment_batches b`;
  }

  /** Đợt mới nhất lên đầu, theo ngày bắt đầu. */
  async list(query: ListBatchesDto = {}): Promise<Batch[]> {
    const today = todayInVietnam();
    const rows = await this.db.all<BatchRow>(
      `${this.selectAll()}
       ${query.status ? 'WHERE b.status = ?' : ''}
       ORDER BY b.startDate DESC, b.id DESC`,
      query.status ? [query.status] : [],
    );

    const items = rows.map((row) => toBatch(row, today));
    if (!query.search) return items;
    return items.filter((batch) =>
      matchesSearch(query.search ?? '', batch.name, batch.description),
    );
  }

  async findOne(id: number): Promise<Batch | null> {
    const row = await this.db.get<BatchRow>(
      `${this.selectAll()} WHERE b.id = ?`,
      [id],
    );
    return row ? toBatch(row, todayInVietnam()) : null;
  }

  async findOneOrFail(id: number): Promise<Batch> {
    const batch = await this.findOne(id);
    if (!batch) {
      throw new NotFoundException(`Không tìm thấy đợt tuyển dụng ${id}`);
    }
    return batch;
  }

  async create(dto: CreateBatchDto): Promise<Batch> {
    this.assertDates(dto.startDate, dto.endDate);
    const now = new Date().toISOString();

    const result = await this.db.run(
      `INSERT INTO recruitment_batches
         (name, description, startDate, endDate, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.name,
        dto.description ?? null,
        dto.startDate,
        dto.endDate,
        dto.status ?? 'draft',
        now,
        now,
      ],
    );
    return this.findOneOrFail(result.lastInsertId);
  }

  async update(id: number, dto: UpdateBatchDto): Promise<Batch> {
    const current = await this.findOneOrFail(id);
    const startDate = dto.startDate ?? current.startDate;
    const endDate = dto.endDate ?? current.endDate;
    this.assertDates(startDate, endDate);

    await this.db.run(
      `UPDATE recruitment_batches
          SET name = ?, description = ?, startDate = ?, endDate = ?,
              status = ?, updatedAt = ?
        WHERE id = ?`,
      [
        dto.name ?? current.name,
        dto.description !== undefined ? dto.description : current.description,
        startDate,
        endDate,
        dto.status ?? current.status,
        new Date().toISOString(),
        id,
      ],
    );
    return this.findOneOrFail(id);
  }

  /**
   * Chỉ xoá được đợt trống. Đợt đã có vị trí thì nên chuyển sang "Đã đóng":
   * hồ sơ ứng viên của đợt là dữ liệu cần giữ để tra lại.
   */
  async remove(id: number): Promise<void> {
    const batch = await this.findOneOrFail(id);
    if (batch.jobCount > 0) {
      throw new ConflictException(
        `Đợt "${batch.name}" còn ${batch.jobCount} vị trí. Hãy xoá các vị trí trước, hoặc chuyển đợt sang Đã đóng.`,
      );
    }
    await this.db.run('DELETE FROM recruitment_batches WHERE id = ?', [id]);
  }

  private assertDates(startDate: string, endDate: string): void {
    assertRealDate(startDate, 'Ngày bắt đầu');
    assertRealDate(endDate, 'Ngày kết thúc');
    if (startDate > endDate) {
      throw new BadRequestException(
        'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu',
      );
    }
  }
}
