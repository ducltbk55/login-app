import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { slugify } from '../common/slugify';
import { DatabaseService } from '../database/database.service';
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
    private readonly db: DatabaseService,
    private readonly catalog: PermissionCatalogService,
  ) {}

  /** Tạo sẵn nhóm "Administrators" (đủ quyền) nếu DB chưa có nhóm nào. */
  async onModuleInit(): Promise<void> {
    // Nhóm mặc định cần danh mục quyền đã có dữ liệu.
    await this.catalog.ensureSeeded();
    if ((await this.count()) > 0) return;

    await this.create({
      name: 'Administrators',
      slug: ADMIN_GROUP_SLUG,
      description: 'Nhóm mặc định, có toàn bộ quyền của hệ thống',
      permissions: await this.catalog.keys(),
    });
    this.logger.log('Đã tạo nhóm quyền mặc định "Administrators"');
  }

  async list(): Promise<PermissionGroup[]> {
    const rows = await this.db.all<GroupRow>(
      'SELECT * FROM permission_groups ORDER BY name',
    );

    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  async findOne(id: number): Promise<PermissionGroup | null> {
    const row = await this.db.get<GroupRow>(
      'SELECT * FROM permission_groups WHERE id = ?',
      [id],
    );
    return row ? this.hydrate(row) : null;
  }

  async findOneOrFail(id: number): Promise<PermissionGroup> {
    const group = await this.findOne(id);
    if (!group) {
      throw new NotFoundException(`Không tìm thấy nhóm quyền ${id}`);
    }
    return group;
  }

  async count(): Promise<number> {
    const row = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM permission_groups',
    );
    return Number(row?.total ?? 0);
  }

  async create(dto: CreatePermissionGroupDto): Promise<PermissionGroup> {
    const now = new Date().toISOString();
    const slug = await this.resolveSlug(dto.slug, dto.name);

    return this.db.transaction(async () => {
      const result = await this.db.run(
        `INSERT INTO permission_groups
           (name, slug, description, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [dto.name, slug, dto.description?.trim() || null, now, now],
      );

      const id = result.lastInsertId;
      await this.replacePermissions(id, dto.permissions ?? []);
      return this.findOneOrFail(id);
    });
  }

  async update(
    id: number,
    dto: UpdatePermissionGroupDto,
  ): Promise<PermissionGroup> {
    const existing = await this.findOneOrFail(id);
    const name = dto.name ?? existing.name;
    const slug =
      dto.slug !== undefined
        ? await this.resolveSlug(dto.slug, name, id)
        : existing.slug;

    return this.db.transaction(async () => {
      await this.db.run(
        `UPDATE permission_groups
            SET name = ?, slug = ?, description = ?, updatedAt = ?
          WHERE id = ?`,
        [
          name,
          slug,
          dto.description === undefined
            ? existing.description
            : dto.description?.trim() || null,
          new Date().toISOString(),
          id,
        ],
      );

      if (dto.permissions !== undefined) {
        await this.replacePermissions(id, dto.permissions);
      }
      return this.findOneOrFail(id);
    });
  }

  /** Xoá nhóm; ON DELETE CASCADE tự dọn quyền và các liên kết với user. */
  async remove(id: number): Promise<void> {
    await this.findOneOrFail(id);
    await this.db.run('DELETE FROM permission_groups WHERE id = ?', [id]);
  }

  /** Kiểm tra toàn bộ id có tồn tại, dùng trước khi gán nhóm cho user. */
  async assertAllExist(ids: number[]): Promise<void> {
    for (const id of ids) {
      await this.findOneOrFail(id);
    }
  }

  private async hydrate(row: GroupRow): Promise<PermissionGroup> {
    const permissions = await this.db.all<{ permission: string }>(
      `SELECT permission FROM permission_group_permissions
        WHERE groupId = ? ORDER BY permission COLLATE utf8mb4_bin`,
      [row.id],
    );

    const members = await this.db.get<{ total: number }>(
      'SELECT COUNT(*) AS total FROM user_permission_groups WHERE groupId = ?',
      [row.id],
    );

    return {
      ...row,
      id: Number(row.id),
      permissions: permissions.map((p) => p.permission),
      memberCount: Number(members?.total ?? 0),
    };
  }

  private async replacePermissions(
    groupId: number,
    permissions: string[],
  ): Promise<void> {
    await this.catalog.assertAllExist(permissions);

    await this.db.run(
      'DELETE FROM permission_group_permissions WHERE groupId = ?',
      [groupId],
    );

    for (const permission of new Set(permissions)) {
      await this.db.run(
        `INSERT INTO permission_group_permissions (groupId, permission)
         VALUES (?, ?)`,
        [groupId, permission],
      );
    }
  }

  private async resolveSlug(
    slug: string | undefined,
    name: string,
    id?: number,
  ): Promise<string> {
    const value = slug?.trim() || slugify(name);
    if (!value) {
      throw new ConflictException(
        'Không sinh được slug từ name, hãy nhập slug thủ công',
      );
    }

    // `<=>` là so sánh an toàn với NULL của MySQL (tương đương `IS` của SQLite).
    const clash = await this.db.get<{ id: number }>(
      'SELECT id FROM permission_groups WHERE slug = ? AND NOT (id <=> ?)',
      [value, id ?? null],
    );

    if (clash) {
      throw new ConflictException(`Slug "${value}" đã được dùng`);
    }
    return value;
  }
}
