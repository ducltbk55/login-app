import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { matchesSearch } from '../common/search';
import { SqliteService } from '../database/sqlite.service';
import { AddressService } from '../categories/address.service';
import { PermissionCatalogService } from '../permission-groups/permission-catalog.service';
import { PermissionGroupsService } from '../permission-groups/permission-groups.service';
import { AssignGroupsDto } from './dto/assign-groups.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { SyncUserDto } from './dto/sync-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

type UserRow = Omit<User, 'profileCompleted'>;

/** Các trường bắt buộc của bước "hoàn tất hồ sơ". */
const PROFILE_FIELDS = [
  'phone',
  'gender',
  'birthDate',
  'addressLine',
  'provinceCode',
  'wardCode',
] as const satisfies readonly (keyof UserRow)[];

/** node:sqlite trả cột INTEGER có thể là bigint, nên ép về number khi đọc ra. */
function toUser(row: UserRow): User {
  return {
    ...row,
    id: Number(row.id),
    loginCount: Number(row.loginCount),
    // Suy ra chứ không lưu: thêm trường bắt buộc mới là tự có hiệu lực ngay.
    profileCompleted: PROFILE_FIELDS.every((field) => !!row[field]),
  };
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly sqlite: SqliteService,
    private readonly groups: PermissionGroupsService,
    private readonly catalog: PermissionCatalogService,
    private readonly address: AddressService,
  ) {}

  /**
   * Đăng ký (lần đầu) hoặc ghi nhận đăng nhập (các lần sau) cho một tài khoản Google.
   * Idempotent theo email: gọi lại nhiều lần không tạo bản ghi trùng.
   */
  /**
   * Đăng nhập hoặc đăng ký — hai luồng tách bạch, quyết định bằng `dto.mode`.
   *
   * Trước đây một lần gọi vừa tạo vừa đăng nhập, nên ai có tài khoản Google là
   * vào được ngay. Giờ đăng ký chỉ tạo hồ sơ ở trạng thái chờ duyệt, còn đăng
   * nhập đòi tài khoản đã tồn tại và đang hoạt động.
   */
  sync(dto: SyncUserDto): SyncResult {
    // Đọc và ghi trong cùng transaction để hai request song song không cùng INSERT.
    const result = this.sqlite.transaction<SyncResult>(() =>
      dto.mode === 'register' ? this.register(dto) : this.login(dto),
    );

    this.logger.log(
      `${result.isNewUser ? 'Đăng ký mới (chờ duyệt)' : 'Đăng nhập'}: ` +
        `${result.user.email}`,
    );
    return result;
  }

  /** Tạo tài khoản mới ở trạng thái chờ duyệt; chưa tính là một lần đăng nhập. */
  private register(dto: SyncUserDto): SyncResult {
    if (this.findByEmail(dto.email)) {
      throw new ConflictException(
        'Email này đã đăng ký. Hãy đăng nhập thay vì đăng ký lại.',
      );
    }

    return {
      user: this.insertUser(dto, new Date().toISOString()),
      isNewUser: true,
    };
  }

  /** Ghi nhận đăng nhập; chỉ tài khoản đã duyệt mới qua được. */
  private login(dto: SyncUserDto): SyncResult {
    const now = new Date().toISOString();
    const existing = this.findByEmail(dto.email);

    if (!existing) {
      throw new NotFoundException(
        'Email này chưa đăng ký. Hãy đăng ký trước khi đăng nhập.',
      );
    }
    if (existing.status === 'inactive') {
      throw new ForbiddenException(
        'Tài khoản đang chờ quản trị viên duyệt. Vui lòng quay lại sau.',
      );
    }
    if (existing.status === 'blocked') {
      throw new ForbiddenException('Tài khoản đã bị khoá');
    }

    const user = this.recordLogin(existing, dto, now);

    this.sqlite.db
      .prepare(
        `INSERT INTO login_events (userId, provider, occurredAt)
         VALUES (?, ?, ?)`,
      )
      .run(user.id, dto.provider, now);

    return { user, isNewUser: false };
  }

  findByEmail(email: string): User | null {
    const row = this.sqlite.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;
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

  /** Tra theo khoá chính. Chỉ dùng cho đăng nhập-theo-id lúc phát triển. */
  findById(id: number): User | null {
    const row = this.sqlite.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as UserRow | undefined;
    return row ? toUser(row) : null;
  }

  findDetailByIdOrFail(id: number): UserDetail {
    const user = this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với id ${id}`);
    }
    return this.withGroups(user);
  }

  /** Bản ghi kèm nhóm quyền + quyền hiệu lực, dùng cho trang chi tiết admin. */
  findDetailOrFail(email: string): UserDetail {
    return this.withGroups(this.findByEmailOrFail(email));
  }

  /** Gắn nhóm quyền + quyền hiệu lực vào một bản ghi đã tra được. */
  private withGroups(user: User): UserDetail {
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
      .all(...params) as UserRow[];

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
                SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked
           FROM users`,
      )
      .get() as
      | { total: number; admins: number; pending: number; blocked: number }
      | undefined;

    return {
      total: Number(row?.total ?? 0),
      admins: Number(row?.admins ?? 0),
      pending: Number(row?.pending ?? 0),
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
      (role !== 'admin' || status !== 'active');

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

  /**
   * Người dùng tự khai hồ sơ sau khi đăng nhập bằng Google.
   *
   * Tách khỏi `update` (vốn dành cho admin đổi vai trò/trạng thái) để chủ tài
   * khoản không bao giờ chạm được vào role và status của chính mình.
   */
  updateProfile(email: string, dto: UpdateProfileDto): UserDetail {
    const user = this.findByEmailOrFail(email);
    this.address.assertValidAddress(dto.provinceCode, dto.wardCode);

    if (new Date(dto.birthDate) > new Date()) {
      throw new BadRequestException('Ngày sinh không thể ở tương lai');
    }

    this.sqlite.db
      .prepare(
        `UPDATE users
            SET phone = ?, gender = ?, birthDate = ?,
                addressLine = ?, provinceCode = ?, wardCode = ?
          WHERE id = ?`,
      )
      .run(
        dto.phone,
        dto.gender,
        dto.birthDate,
        dto.addressLine,
        dto.provinceCode,
        dto.wardCode,
        user.id,
      );

    this.logger.log(`Cập nhật hồ sơ: ${email}`);
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
    const rows = this.sqlite.db
      .prepare(
        `SELECT * FROM login_events
          WHERE userId = ?
          ORDER BY occurredAt DESC
          LIMIT ?`,
      )
      .all(user.id, clampLimit(limit)) as LoginEvent[];

    return rows.map((row) => ({
      ...row,
      id: Number(row.id),
      userId: Number(row.userId),
    }));
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

  private findGroups(userId: number): UserGroupRef[] {
    const rows = this.sqlite.db
      .prepare(
        `SELECT g.id, g.name, g.slug
           FROM user_permission_groups ug
           JOIN permission_groups g ON g.id = ug.groupId
          WHERE ug.userId = ?
          ORDER BY g.name COLLATE NOCASE`,
      )
      .all(userId) as UserGroupRef[];

    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  /** Role admin được coi là có toàn bộ quyền, khỏi phải tự gán nhóm cho mình. */
  private effectivePermissions(user: User, groups: UserGroupRef[]): string[] {
    if (user.role === 'admin') return this.catalog.keys();
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

  /**
   * Tài khoản mới: INSERT bản ghi đầu tiên; `id` do SQLite tự cấp.
   * `status` là `inactive` và `loginCount` là 0 — chưa duyệt thì chưa đăng
   * nhập được lần nào.
   */
  private insertUser(dto: SyncUserDto, now: string): User {
    const user: Omit<User, 'id' | 'profileCompleted'> = {
      accountId: randomUUID(),
      phone: null,
      gender: null,
      birthDate: null,
      addressLine: null,
      provinceCode: null,
      wardCode: null,
      email: dto.email,
      name: dto.name ?? null,
      image: dto.image ?? null,
      provider: dto.provider,
      role: 'user',
      status: 'inactive',
      createdAt: now,
      lastLoginAt: now,
      loginCount: 0,
    };

    const result = this.sqlite.db
      .prepare(
        `INSERT INTO users
           (accountId, email, name, image, provider, role, status,
            createdAt, lastLoginAt, loginCount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        user.accountId,
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

    return {
      ...user,
      id: Number(result.lastInsertRowid),
      profileCompleted: false,
    };
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
