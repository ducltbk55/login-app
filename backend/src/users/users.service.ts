import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { SqliteService } from '../database/sqlite.service';
import { SyncUserDto } from './dto/sync-user.dto';
import { LoginEvent, SyncResult, User } from './user.entity';

export const DEFAULT_LOGIN_HISTORY_LIMIT = 20;
const MAX_LOGIN_HISTORY_LIMIT = 100;

/** SQLite không có kiểu boolean/number rõ ràng nên chuẩn hoá lại khi đọc ra. */
function toUser(row: User): User {
  return { ...row, loginCount: Number(row.loginCount) };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly sqlite: SqliteService) {}

  /**
   * Đăng ký (lần đầu) hoặc ghi nhận đăng nhập (các lần sau) cho một tài khoản Google.
   * Idempotent theo email: gọi lại nhiều lần không tạo bản ghi trùng.
   */
  sync(dto: SyncUserDto): SyncResult {
    // Đọc và ghi trong cùng transaction để hai request song song không cùng INSERT.
    const result = this.sqlite.transaction<SyncResult>(() => {
      const now = new Date().toISOString();
      const existing = this.findByEmail(dto.email);
      const user = existing
        ? this.recordLogin(existing, dto, now)
        : this.insertUser(dto, now);

      this.sqlite.db
        .prepare(
          `INSERT INTO login_events (id, userId, provider, occurredAt)
           VALUES (?, ?, ?, ?)`,
        )
        .run(randomUUID(), user.id, dto.provider, now);

      return { user, isNewUser: !existing };
    });

    this.logger.log(
      `${result.isNewUser ? 'Đăng ký mới' : 'Đăng nhập'}: ${result.user.email} ` +
        `(lần thứ ${result.user.loginCount})`,
    );
    return result;
  }

  findByEmail(email: string): User | null {
    const row = this.sqlite.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as User | undefined;
    return row ? toUser(row) : null;
  }

  findByEmailOrFail(email: string): User {
    const user = this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với email ${email}`,
      );
    }
    return user;
  }

  findAll(): User[] {
    const rows = this.sqlite.db
      .prepare('SELECT * FROM users ORDER BY createdAt DESC')
      .all() as User[];
    return rows.map(toUser);
  }

  countAll(): number {
    const row = this.sqlite.db
      .prepare('SELECT COUNT(*) AS total FROM users')
      .get() as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  findLoginHistory(
    email: string,
    limit = DEFAULT_LOGIN_HISTORY_LIMIT,
  ): LoginEvent[] {
    const user = this.findByEmailOrFail(email);
    return this.sqlite.db
      .prepare(
        `SELECT * FROM login_events
          WHERE userId = ?
          ORDER BY occurredAt DESC
          LIMIT ?`,
      )
      .all(user.id, clampLimit(limit)) as LoginEvent[];
  }

  /** Tài khoản mới: INSERT bản ghi đầu tiên. */
  private insertUser(dto: SyncUserDto, now: string): User {
    const user: User = {
      id: randomUUID(),
      email: dto.email,
      name: dto.name ?? null,
      image: dto.image ?? null,
      provider: dto.provider,
      createdAt: now,
      lastLoginAt: now,
      loginCount: 1,
    };

    this.sqlite.db
      .prepare(
        `INSERT INTO users (id, email, name, image, provider, createdAt, lastLoginAt, loginCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.id,
        user.email,
        user.name,
        user.image,
        user.provider,
        user.createdAt,
        user.lastLoginAt,
        user.loginCount,
      );

    return user;
  }

  /** Tài khoản đã có: cập nhật tên/ảnh mới nhất từ Google và tăng loginCount. */
  private recordLogin(existing: User, dto: SyncUserDto, now: string): User {
    this.sqlite.db
      .prepare(
        `UPDATE users
            SET name = COALESCE(?, name),
                image = COALESCE(?, image),
                lastLoginAt = ?,
                loginCount = loginCount + 1
          WHERE id = ?`,
      )
      .run(dto.name ?? null, dto.image ?? null, now, existing.id);

    return {
      ...existing,
      name: dto.name ?? existing.name,
      image: dto.image ?? existing.image,
      lastLoginAt: now,
      loginCount: existing.loginCount + 1,
    };
  }
}

function clampLimit(limit: number): number {
  if (!Number.isFinite(limit)) return DEFAULT_LOGIN_HISTORY_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LOGIN_HISTORY_LIMIT);
}
