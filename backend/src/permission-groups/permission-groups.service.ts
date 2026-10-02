import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { slugify } from '../common/slugify';
import { SqliteService } from '../database/sqlite.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from './dto/save-permission-group.dto';
import { PermissionCatalogService } from './permission-catalog.service';
import { PermissionGroup } from './permission-group.entity';

type GroupRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export const ADMIN_GROUP_SLUG = 'administrators';

@Injectable()
export class PermissionGroupsService implements OnModuleInit {
  private readonly logger = new Logger(PermissionGroupsService.name);

  constructor(
    private readonly sqlite: SqliteService,
    private readonly catalog: PermissionCatalogService,
  ) {}

  /** Tạo sẵn nhóm "Administrators" (đủ quyền) nếu DB chưa có nhóm nào. */
  onModuleInit(): void {
    // Nhóm mặc định cần danh mục quyền đã có dữ liệu.
    this.catalog.ensureSeeded();
    if (this.count() > 0) return;

    this.create({
      name: 'Administrators',
      slug: ADMIN_GROUP_SLUG,
      description: 'Nhóm mặc định, có toàn bộ quyền của hệ thống',
      permissions: this.catalog.keys(),
    });
    this.logger.log('Đã tạo nhóm quyền mặc định "Administrators"');
  }

  list(): PermissionGroup[] {
    const rows = this.sqlite.db
      .prepare('SELECT * FROM permission_groups ORDER BY name COLLATE NOCASE')
      .all() as GroupRow[];

    return rows.map((row) => this.hydrate(row));
  }

  findOne(id: number): PermissionGroup | null {
    const row = this.sqlite.db
      .prepare('SELECT * FROM permission_groups WHERE id = ?')
      .get(id) as GroupRow | undefined;
    return row ? this.hydrate(row) : null;
  }

  findOneOrFail(id: number): PermissionGroup {
    const group = this.findOne(id);
    if (!group) {
      throw new NotFoundException(`Không tìm thấy nhóm quyền ${id}`);
    }
    return group;
  }

  count(): number {
    const row = this.sqlite.db
      .prepare('SELECT COUNT(*) AS total FROM permission_groups')
      .get() as { total: number } | undefined;
    return Number(row?.total ?? 0);
  }

  create(dto: CreatePermissionGroupDto): PermissionGroup {
    const now = new Date().toISOString();
    const slug = this.resolveSlug(dto.slug, dto.name);

    return this.sqlite.transaction(() => {
      const result = this.sqlite.db
        .prepare(
          `INSERT INTO permission_groups
             (name, slug, description, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(dto.name, slug, dto.description?.trim() || null, now, now);

      const id = Number(result.lastInsertRowid);
      this.replacePermissions(id, dto.permissions ?? []);
      return this.findOneOrFail(id);
    });
  }

  update(id: number, dto: UpdatePermissionGroupDto): PermissionGroup {
    const existing = this.findOneOrFail(id);
    const name = dto.name ?? existing.name;
    const slug =
      dto.slug !== undefined
        ? this.resolveSlug(dto.slug, name, id)
        : existing.slug;

    return this.sqlite.transaction(() => {
      this.sqlite.db
        .prepare(
          `UPDATE permission_groups
              SET name = ?, slug = ?, description = ?, updatedAt = ?
            WHERE id = ?`,
        )
        .run(
          name,
          slug,
          dto.description === undefined
            ? existing.description
            : dto.description?.trim() || null,
          new Date().toISOString(),
          id,
        );

      if (dto.permissions !== undefined) {
        this.replacePermissions(id, dto.permissions);
      }
      return this.findOneOrFail(id);
    });
  }

  /** Xoá nhóm; ON DELETE CASCADE tự dọn quyền và các liên kết với user. */
  remove(id: number): void {
    this.findOneOrFail(id);
    this.sqlite.db
      .prepare('DELETE FROM permission_groups WHERE id = ?')
      .run(id);
  }

  /** Kiểm tra toàn bộ id có tồn tại, dùng trước khi gán nhóm cho user. */
  assertAllExist(ids: number[]): void {
    for (const id of ids) {
      this.findOneOrFail(id);
    }
  }

  private hydrate(row: GroupRow): PermissionGroup {
    const permissions = this.sqlite.db
      .prepare(
        `SELECT permission FROM permission_group_permissions
          WHERE groupId = ? ORDER BY permission`,
      )
      .all(row.id) as { permission: string }[];

    const members = this.sqlite.db
      .prepare(
        'SELECT COUNT(*) AS total FROM user_permission_groups WHERE groupId = ?',
      )
      .get(row.id) as { total: number } | undefined;

    return {
      ...row,
      id: Number(row.id),
      permissions: permissions.map((p) => p.permission),
      memberCount: Number(members?.total ?? 0),
    };
  }

  private replacePermissions(groupId: number, permissions: string[]): void {
    this.catalog.assertAllExist(permissions);

    this.sqlite.db
      .prepare('DELETE FROM permission_group_permissions WHERE groupId = ?')
      .run(groupId);

    const insert = this.sqlite.db.prepare(
      `INSERT INTO permission_group_permissions (groupId, permission)
       VALUES (?, ?)`,
    );
    for (const permission of new Set(permissions)) {
      insert.run(groupId, permission);
    }
  }

  private resolveSlug(slug: string | undefined, name: string, id?: number) {
    const value = slug?.trim() || slugify(name);
    if (!value) {
      throw new ConflictException(
        'Không sinh được slug từ name, hãy nhập slug thủ công',
      );
    }

    const clash = this.sqlite.db
      .prepare(
        'SELECT id FROM permission_groups WHERE slug = ? AND id IS NOT ?',
      )
      .get(value, id ?? null) as { id: number } | undefined;

    if (clash) {
      throw new ConflictException(`Slug "${value}" đã được dùng`);
    }
    return value;
  }
}
