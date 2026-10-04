import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rmSync, writeFileSync } from 'node:fs';

import { matchesSearch } from '../common/search';
import { uploadDir } from '../common/upload-dir';
import { DatabaseService } from '../database/database.service';
import {
  isInlineSafe,
  resolveInsideDir,
  safeDisplayName,
  storageName,
} from './attachments';
import type { Contact, ContactStats, ContactStatus } from './contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsDto } from './dto/list-contacts.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

type ContactRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  attachmentName: string | null;
  attachmentFile: string | null;
  attachmentMime: string | null;
  attachmentSize: number | null;
  status: string;
  note: string | null;
  handledBy: string | null;
  handledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Tệp đã nhận từ multer, rút gọn về đúng phần cần dùng. */
export type UploadedAttachment = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function toContact(row: ContactRow): Contact {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    attachment:
      row.attachmentFile === null || row.attachmentMime === null
        ? null
        : {
            name: row.attachmentName ?? 'tep-dinh-kem',
            mime: row.attachmentMime,
            size: Number(row.attachmentSize ?? 0),
            inline: isInlineSafe(row.attachmentMime),
          },
    status: row.status as ContactStatus,
    note: row.note,
    handledBy: row.handledBy,
    handledAt: row.handledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Tệp nằm trong `UPLOAD_DIR/contacts` (mặc định `data/uploads/contacts`),
   * không nằm trong thư mục tĩnh nào: đính kèm có thể chứa thông tin riêng
   * của khách, chỉ admin đã đăng nhập mới được đọc qua endpoint có kiểm soát.
   */
  private uploadDir(): string {
    return uploadDir(this.config, 'contacts');
  }

  async list(query: ListContactsDto = {}): Promise<Contact[]> {
    const where: string[] = [];
    const params: string[] = [];

    if (query.status !== undefined) {
      where.push('status = ?');
      params.push(query.status);
    }

    const rows = await this.db.all<ContactRow>(
      `SELECT * FROM contacts
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY createdAt DESC, id DESC`,
      params,
    );

    const items = rows.map(toContact);
    if (!query.search) return items;

    return items.filter((contact) =>
      matchesSearch(
        query.search ?? '',
        contact.name,
        contact.email,
        contact.subject ?? '',
        contact.message,
      ),
    );
  }

  async findOne(id: number): Promise<Contact | null> {
    const row = await this.db.get<ContactRow>(
      'SELECT * FROM contacts WHERE id = ?',
      [id],
    );
    return row ? toContact(row) : null;
  }

  async findOneOrFail(id: number): Promise<Contact> {
    const contact = await this.findOne(id);
    if (!contact) {
      throw new NotFoundException(`Không tìm thấy liên hệ ${id}`);
    }
    return contact;
  }

  async stats(): Promise<ContactStats> {
    const rows = await this.db.all<{ status: string; total: number }>(
      'SELECT status, COUNT(*) AS total FROM contacts GROUP BY status',
    );

    const by = (status: ContactStatus) =>
      Number(rows.find((row) => row.status === status)?.total ?? 0);

    return {
      total: rows.reduce((sum, row) => sum + Number(row.total), 0),
      pending: by('new'),
      inProgress: by('in_progress'),
      resolved: by('resolved'),
    };
  }

  async create(
    dto: CreateContactDto,
    file?: UploadedAttachment,
  ): Promise<Contact> {
    const now = new Date().toISOString();

    // Ghi file TRƯỚC khi insert: nếu ghi hỏng thì chưa có bản ghi nào trỏ tới
    // một tệp không tồn tại. Chiều ngược lại thì để lại file mồ côi, dọn được.
    let fileName: string | null = null;
    if (file) {
      fileName = storageName(file.mimetype);
      writeFileSync(resolveInsideDir(this.uploadDir(), fileName), file.buffer);
    }

    try {
      const result = await this.db.run(
        `INSERT INTO contacts
           (name, email, phone, subject, message,
            attachmentName, attachmentFile, attachmentMime, attachmentSize,
            status, note, handledBy, handledAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', NULL, NULL, NULL, ?, ?)`,
        [
          dto.name,
          dto.email,
          dto.phone ?? null,
          dto.subject ?? null,
          dto.message,
          file ? safeDisplayName(file.originalname) : null,
          fileName,
          file ? file.mimetype : null,
          file ? file.size : null,
          now,
          now,
        ],
      );

      return await this.findOneOrFail(result.lastInsertId);
    } catch (error) {
      // Insert hỏng thì tệp vừa ghi thành rác, xoá ngay cho sạch.
      if (fileName) this.removeFile(fileName);
      throw error;
    }
  }

  async update(id: number, dto: UpdateContactDto): Promise<Contact> {
    const current = await this.findOneOrFail(id);
    const now = new Date().toISOString();
    const status = dto.status ?? current.status;

    // Mốc "đã xử lý lúc nào" chỉ đổi khi trạng thái thực sự đổi — sửa ghi chú
    // không phải là xử lý.
    const statusChanged = status !== current.status;
    const handledAt = statusChanged
      ? status === 'new'
        ? null // trả về hàng đợi thì xoá luôn dấu vết đã xử lý
        : now
      : current.handledAt;
    const handledBy = statusChanged
      ? status === 'new'
        ? null
        : (dto.handledBy ?? current.handledBy)
      : current.handledBy;

    await this.db.run(
      `UPDATE contacts
          SET status = ?, note = ?, handledBy = ?, handledAt = ?, updatedAt = ?
        WHERE id = ?`,
      [
        status,
        dto.note !== undefined ? dto.note : current.note,
        handledBy,
        handledAt,
        now,
        id,
      ],
    );

    return this.findOneOrFail(id);
  }

  async remove(id: number): Promise<void> {
    const contact = await this.findOneOrFail(id);
    const row = await this.db.get<{ attachmentFile: string | null }>(
      'SELECT attachmentFile FROM contacts WHERE id = ?',
      [id],
    );

    await this.db.run('DELETE FROM contacts WHERE id = ?', [id]);

    // Xoá bản ghi rồi mới xoá tệp: còn tệp mồ côi thì vô hại, còn bản ghi trỏ
    // tới tệp đã mất thì admin bấm xem sẽ gặp lỗi.
    if (row?.attachmentFile) this.removeFile(row.attachmentFile);
    this.logger.log(`Đã xoá liên hệ ${id} của ${contact.email}`);
  }

  /** Đường dẫn tuyệt đối tới tệp đính kèm, để controller stream về. */
  async attachmentPath(
    id: number,
  ): Promise<{ path: string; name: string; mime: string }> {
    const row = await this.db.get<{
      attachmentFile: string | null;
      attachmentName: string | null;
      attachmentMime: string | null;
    }>(
      'SELECT attachmentFile, attachmentName, attachmentMime FROM contacts WHERE id = ?',
      [id],
    );

    if (!row) throw new NotFoundException(`Không tìm thấy liên hệ ${id}`);
    if (!row.attachmentFile || !row.attachmentMime) {
      throw new NotFoundException('Liên hệ này không có tệp đính kèm');
    }

    return {
      path: resolveInsideDir(this.uploadDir(), row.attachmentFile),
      name: row.attachmentName ?? 'tep-dinh-kem',
      mime: row.attachmentMime,
    };
  }

  private removeFile(fileName: string): void {
    try {
      rmSync(resolveInsideDir(this.uploadDir(), fileName), { force: true });
    } catch (error) {
      // Không xoá được tệp thì chỉ tốn chỗ, không đáng để hỏng cả thao tác.
      this.logger.warn(
        `Không xoá được tệp đính kèm ${fileName}: ${String(error)}`,
      );
    }
  }
}
