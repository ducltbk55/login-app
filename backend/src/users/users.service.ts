import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PERMISSION_KEYS } from '../common/permissions';
import { matchesSearch } from '../common/search';
import { SqliteService } from '../database/sqlite.service';
import { PermissionGroupsService } from '../permission-groups/permission-groups.service';
import { AssignGroupsDto } from './dto/assign-groups.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  LoginEvent,
  SyncResult,
  User,
  UserDetail,
  UserGroupRef,
  UserStats,
} from './user.entity';

export const DEFAULT_LOGIN_HISTORY_LIMIT = 20;
const MAX_LOGIN_HISTORY_LIMIT = 100;

/** SQLite không có kiểu boolean/number rõ ràng nên chuẩn hoá lại khi đọc ra. */
function toUser(row: User): User {
  return { ...row, loginCount: Number(row.loginCount) };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly sqlite: SqliteService,
    private readonly groups: PermissionGroupsService,
  ) {}

  /**
   * Đăng ký (lần đầu) hoặc ghi nhận đăng nhập (các lần sau) cho một tài khoản Google.
   * Idempotent theo email: gọi lại nhiều lần không tạo bản ghi trùng.
   */
  sync(dto: SyncUserDto): SyncResult {
    // Đọc và ghi trong cùng transaction để hai request song song không cùng INSERT.
    const result = this.sqlite.transaction<SyncResult>(() => {
      const now = new Date().toISOString();
      const existing = this.findByEmail(dto.email);

      // Tài khoản bị khoá thì không ghi nhận đăng nhập, kể cả khi Google đã xác thực.
      if (existing?.status === 'blocked') {
        throw new ForbiddenException('Tài khoản đã bị khoá');
      }

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

  /** Bản ghi kèm nhóm quyền + quyền hiệu lực, dùng cho trang chi tiết admin. */
  findDetailOrFail(email: string): UserDetail {
    const user = this.findByEmailOrFail(email);
    const groups = this.findGroups(user.id);

    return {
      ...user,
      groups,
      permissions: this.effectivePermissions(user, groups),
    };
  }

  findAll(query: ListUsersDto = {}): User[] {
    const where: string[] = [];
    const params: string[] = [];

    if (query.role) {
      where.push('role = ?');
      params.push(query.role);
    }
    if (query.status) {
      where.push('status = ?');
      params.push(query.status);
    }

    const rows = this.sqlite.db
      .prepare(
        `SELECT * FROM users
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY createdAt DESC`,
      )
      .all(...params) as User[];

    const items = rows.map(toUser);
    if (!query.search) return items;

    return items.filter((u) =>
      matchesSearch(query.search ?? '', u.name, u.email),
    );
  }

  countAll(): number {
    const row = this.sqlite.db
      .prepare('SELECT COUNT(*) AS total FROM users')
      .get() as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  stats(): UserStats {
    const row = this.sqlite.db
      .prepare(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
                SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked
           FROM users`,
      )
      .get() as { total: number; admins: number; blocked: number } | undefined;

    return {
      total: Number(row?.total ?? 0),
      admins: Number(row?.admins ?? 0),
      blocked: Number(row?.blocked ?? 0),
    };
  }

  /** Đổi vai trò / trạng thái. Chặn việc vô tình bỏ mất admin cuối cùng. */
  update(email: string, dto: UpdateUserDto): UserDetail {
    const user = this.findByEmailOrFail(email);
    const role = dto.role ?? user.role;
    const status = dto.status ?? user.status;

    const losesAdmin =
      user.role === 'admin' &&
      user.status === 'active' &&
      (role !== 'admin' || status === 'blocked');

    if (losesAdmin && this.countActiveAdmins() <= 1) {
      throw new ForbiddenException(
        'Đây là admin duy nhất đang hoạt động — hãy chỉ định admin khác trước',
      );
    }

    this.sqlite.db
      .prepare('UPDATE users SET role = ?, status = ? WHERE id = ?')
      .run(role, status, user.id);

    this.logger.log(`Cập nhật ${email}: role=${role}, status=${status}`);
    return this.findDetailOrFail(email);
  }

  /** Thay toàn bộ danh sách nhóm quyền của một user. */
  setGroups(email: string, dto: AssignGroupsDto): UserDetail {
    const user = this.findByEmailOrFail(email);
    this.groups.assertAllExist(dto.groupIds);

    this.sqlite.transaction(() => {
      this.sqlite.db
        .prepare('DELETE FROM user_permission_groups WHERE userId = ?')
        .run(user.id);

      const insert = this.sqlite.db.prepare(
        `INSERT INTO user_permission_groups (userId, groupId, assignedAt)
         VALUES (?, ?, ?)`,
      );
      const now = new Date().toISOString();
      for (const groupId of new Set(dto.groupIds)) {
        insert.run(user.id, groupId, now);
      }
    });

    return this.findDetailOrFail(email);
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

  private countActiveAdmins(): number {
    const row = this.sqlite.db
      .prepare(
        `SELECT COUNT(*) AS total FROM users
          WHERE role = 'admin' AND status = 'active'`,
      )
      .get() as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  private findGroups(userId: string): UserGroupRef[] {
    return this.sqlite.db
      .prepare(
        `SELECT g.id, g.name, g.slug
           FROM user_permission_groups ug
           JOIN permission_groups g ON g.id = ug.groupId
          WHERE ug.userId = ?
          ORDER BY g.name COLLATE NOCASE`,
      )
      .all(userId) as UserGroupRef[];
  }

  /** Role admin được coi là có toàn bộ quyền, khỏi phải tự gán nhóm cho mình. */
  private effectivePermissions(user: User, groups: UserGroupRef[]): string[] {
    if (user.role === 'admin') return [...PERMISSION_KEYS];
    if (groups.length === 0) return [];

    const rows = this.sqlite.db
      .prepare(
        `SELECT DISTINCT permission
           FROM permission_group_permissions
          WHERE groupId IN (${groups.map(() => '?').join(', ')})
          ORDER BY permission`,
      )
      .all(...groups.map((g) => g.id)) as { permission: string }[];

    return rows.map((r) => r.permission);
  }

  /** Tài khoản mới: INSERT bản ghi đầu tiên. */
  private insertUser(dto: SyncUserDto, now: string): User {
    const user: User = {
      id: randomUUID(),
      email: dto.email,
      name: dto.name ?? null,
      image: dto.image ?? null,
      provider: dto.provider,
      role: 'user',
      status: 'active',
      createdAt: now,
      lastLoginAt: now,
      loginCount: 1,
    };

    this.sqlite.db
      .prepare(
        `INSERT INTO users
           (id, email, name, image, provider, role, status,
            createdAt, lastLoginAt, loginCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.id,
        user.email,
        user.name,
        user.image,
        user.provider,
        user.role,
        user.status,
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
