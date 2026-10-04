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
import { DatabaseService } from '../database/database.service';
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

/** Ép các cột số về number cho chắc khi đọc ra. */
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
    private readonly db: DatabaseService,
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
  async sync(dto: SyncUserDto): Promise<SyncResult> {
    // Đọc và ghi trong cùng transaction để hai request song song không cùng INSERT.
    const result = await this.db.transaction<SyncResult>(() =>
      dto.mode === 'register' ? this.register(dto) : this.login(dto),
    );

    this.logger.log(
      `${result.isNewUser ? 'Đăng ký mới (chờ duyệt)' : 'Đăng nhập'}: ` +
        `${result.user.email}`,
    );
    return result;
  }

  /** Tạo tài khoản mới ở trạng thái chờ duyệt; chưa tính là một lần đăng nhập. */
  private async register(dto: SyncUserDto): Promise<SyncResult> {
    if (await this.findByEmail(dto.email)) {
      throw new ConflictException(
        'Email này đã đăng ký. Hãy đăng nhập thay vì đăng ký lại.',
      );
    }

    return {
      user: await this.insertUser(dto, new Date().toISOString()),
      isNewUser: true,
    };
  }

  /** Ghi nhận đăng nhập; chỉ tài khoản đã duyệt mới qua được. */
  private async login(dto: SyncUserDto): Promise<SyncResult> {
    const now = new Date().toISOString();
    const existing = await this.findByEmail(dto.email);

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

    const user = await this.recordLogin(existing, dto, now);

    await this.db.run(
      `INSERT INTO login_events (userId, provider, occurredAt)
       VALUES (?, ?, ?)`,
      [user.id, dto.provider, now],
    );

    return { user, isNewUser: false };
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.db.get<UserRow>(
      'SELECT * FROM users WHERE email = ?',
      [email],
    );
    return row ? toUser(row) : null;
  }

  async findByEmailOrFail(email: string): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(
        `Không tìm thấy người dùng với email ${email}`,
      );
    }
    return user;
  }

  /** Tra theo khoá chính. Chỉ dùng cho đăng nhập-theo-id lúc phát triển. */
  async findById(id: number): Promise<User | null> {
    const row = await this.db.get<UserRow>('SELECT * FROM users WHERE id = ?', [
      id,
    ]);
    return row ? toUser(row) : null;
  }

  async findDetailByIdOrFail(id: number): Promise<UserDetail> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với id ${id}`);
    }
    return this.withGroups(user);
  }

  /** Bản ghi kèm nhóm quyền + quyền hiệu lực, dùng cho trang chi tiết admin. */
  async findDetailOrFail(email: string): Promise<UserDetail> {
    return this.withGroups(await this.findByEmailOrFail(email));
  }

  /** Gắn nhóm quyền + quyền hiệu lực vào một bản ghi đã tra được. */
  private async withGroups(user: User): Promise<UserDetail> {
    const groups = await this.findGroups(user.id);
    return {
      ...user,
      groups,
      permissions: await this.effectivePermissions(user, groups),
    };
  }

  async findAll(query: ListUsersDto = {}): Promise<User[]> {
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

    const rows = await this.db.all<UserRow>(
      `SELECT * FROM users
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY createdAt DESC`,
      params,
    );

    const items = rows.map(toUser);
    if (!query.search) return items;

    return items.filter((u) =>
      matchesSearch(query.search ?? '', u.name, u.email),
    );
  }

  async countAll(): Promise<number> {
    const row = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM users',
    );
    return Number(row?.total ?? 0);
  }

  async stats(): Promise<UserStats> {
    const row = await this.db.get<{
      total: number;
      admins: number;
      pending: number;
      blocked: number;
    }>(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
              SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS pending,
              SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) AS blocked
         FROM users`,
    );

    return {
      total: Number(row?.total ?? 0),
      admins: Number(row?.admins ?? 0),
      pending: Number(row?.pending ?? 0),
      blocked: Number(row?.blocked ?? 0),
    };
  }

  /** Đổi vai trò / trạng thái. Chặn việc vô tình bỏ mất admin cuối cùng. */
  async update(email: string, dto: UpdateUserDto): Promise<UserDetail> {
    const user = await this.findByEmailOrFail(email);
    const role = dto.role ?? user.role;
    const status = dto.status ?? user.status;

    const losesAdmin =
      user.role === 'admin' &&
      user.status === 'active' &&
      (role !== 'admin' || status !== 'active');

    if (losesAdmin && (await this.countActiveAdmins()) <= 1) {
      throw new ForbiddenException(
        'Đây là admin duy nhất đang hoạt động — hãy chỉ định admin khác trước',
      );
    }

    await this.db.run('UPDATE users SET role = ?, status = ? WHERE id = ?', [
      role,
      status,
      user.id,
    ]);

    this.logger.log(`Cập nhật ${email}: role=${role}, status=${status}`);
    return this.findDetailOrFail(email);
  }

  /**
   * Người dùng tự khai hồ sơ sau khi đăng nhập bằng Google.
   *
   * Tách khỏi `update` (vốn dành cho admin đổi vai trò/trạng thái) để chủ tài
   * khoản không bao giờ chạm được vào role và status của chính mình.
   */
  async updateProfile(
    email: string,
    dto: UpdateProfileDto,
  ): Promise<UserDetail> {
    const user = await this.findByEmailOrFail(email);
    await this.address.assertValidAddress(dto.provinceCode, dto.wardCode);

    if (new Date(dto.birthDate) > new Date()) {
      throw new BadRequestException('Ngày sinh không thể ở tương lai');
    }

    await this.db.run(
      `UPDATE users
          SET phone = ?, gender = ?, birthDate = ?,
              addressLine = ?, provinceCode = ?, wardCode = ?
        WHERE id = ?`,
      [
        dto.phone,
        dto.gender,
        dto.birthDate,
        dto.addressLine,
        dto.provinceCode,
        dto.wardCode,
        user.id,
      ],
    );

    this.logger.log(`Cập nhật hồ sơ: ${email}`);
    return this.findDetailOrFail(email);
  }

  /** Thay toàn bộ danh sách nhóm quyền của một user. */
  async setGroups(email: string, dto: AssignGroupsDto): Promise<UserDetail> {
    const user = await this.findByEmailOrFail(email);
    await this.groups.assertAllExist(dto.groupIds);

    await this.db.transaction(async () => {
      await this.db.run('DELETE FROM user_permission_groups WHERE userId = ?', [
        user.id,
      ]);

      const now = new Date().toISOString();
      for (const groupId of new Set(dto.groupIds)) {
        await this.db.run(
          `INSERT INTO user_permission_groups (userId, groupId, assignedAt)
           VALUES (?, ?, ?)`,
          [user.id, groupId, now],
        );
      }
    });

    return this.findDetailOrFail(email);
  }

  async findLoginHistory(
    email: string,
    limit = DEFAULT_LOGIN_HISTORY_LIMIT,
  ): Promise<LoginEvent[]> {
    const user = await this.findByEmailOrFail(email);
    const rows = await this.db.all<LoginEvent>(
      `SELECT * FROM login_events
        WHERE userId = ?
        ORDER BY occurredAt DESC, id DESC
        LIMIT ?`,
      [user.id, clampLimit(limit)],
    );

    return rows.map((row) => ({
      ...row,
      id: Number(row.id),
      userId: Number(row.userId),
    }));
  }

  private async countActiveAdmins(): Promise<number> {
    const row = await this.db.get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM users
        WHERE role = 'admin' AND status = 'active'`,
    );
    return Number(row?.total ?? 0);
  }

  private async findGroups(userId: number): Promise<UserGroupRef[]> {
    const rows = await this.db.all<UserGroupRef>(
      `SELECT g.id, g.name, g.slug
         FROM user_permission_groups ug
         JOIN permission_groups g ON g.id = ug.groupId
        WHERE ug.userId = ?
        ORDER BY g.name`,
      [userId],
    );

    return rows.map((row) => ({ ...row, id: Number(row.id) }));
  }

  /** Role admin được coi là có toàn bộ quyền, khỏi phải tự gán nhóm cho mình. */
  private async effectivePermissions(
    user: User,
    groups: UserGroupRef[],
  ): Promise<string[]> {
    if (user.role === 'admin') return this.catalog.keys();
    if (groups.length === 0) return [];

    const rows = await this.db.all<{ permission: string }>(
      `SELECT DISTINCT permission
         FROM permission_group_permissions
        WHERE groupId IN (${groups.map(() => '?').join(', ')})
        ORDER BY permission COLLATE utf8mb4_bin`,
      groups.map((g) => g.id),
    );

    return rows.map((r) => r.permission);
  }

  /**
   * Tài khoản mới: INSERT bản ghi đầu tiên; `id` do MySQL tự cấp.
   * `status` là `inactive` và `loginCount` là 0 — chưa duyệt thì chưa đăng
   * nhập được lần nào.
   */
  private async insertUser(dto: SyncUserDto, now: string): Promise<User> {
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

    const result = await this.db.run(
      `INSERT INTO users
         (accountId, email, name, image, provider, role, status,
          createdAt, lastLoginAt, loginCount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
      ],
    );

    return {
      ...user,
      id: result.lastInsertId,
      profileCompleted: false,
    };
  }

  /** Tài khoản đã có: cập nhật tên/ảnh mới nhất từ Google và tăng loginCount. */
  private async recordLogin(
    existing: User,
    dto: SyncUserDto,
    now: string,
  ): Promise<User> {
    await this.db.run(
      `UPDATE users
          SET name = COALESCE(?, name),
              image = COALESCE(?, image),
              lastLoginAt = ?,
              loginCount = loginCount + 1
        WHERE id = ?`,
      [dto.name ?? null, dto.image ?? null, now, existing.id],
    );

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
