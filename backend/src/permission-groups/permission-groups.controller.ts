import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import type { FunctionDef, PermissionDef } from '../common/permissions';
import { PermissionCatalogService } from './permission-catalog.service';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from './dto/save-permission-group.dto';
import type { PermissionGroup } from './permission-group.entity';
import { PermissionGroupsService } from './permission-groups.service';

@Controller()
@UseGuards(ApiKeyGuard)
export class PermissionGroupsController {
  constructor(
    private readonly groups: PermissionGroupsService,
    private readonly catalog: PermissionCatalogService,
  ) {}

  /** Quyền đang bật trong danh mục quyền, để admin render checkbox. */
  @Get('permissions')
  async permissions(): Promise<{ items: PermissionDef[] }> {
    return { items: await this.catalog.list() };
  }

  /** Chức năng đang bật, theo thứ tự — frontend dựng menu quản trị từ đây. */
  @Get('permissions/functions')
  async functions(): Promise<{ items: FunctionDef[] }> {
    return { items: await this.catalog.functions() };
  }

  @Get('permission-groups')
  async list(): Promise<{ total: number; items: PermissionGroup[] }> {
    const items = await this.groups.list();
    return { total: items.length, items };
  }

  @Get('permission-groups/:id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PermissionGroup> {
    return this.groups.findOneOrFail(id);
  }

  @Post('permission-groups')
  async create(
    @Body() dto: CreatePermissionGroupDto,
  ): Promise<PermissionGroup> {
    return this.groups.create(dto);
  }

  @Patch('permission-groups/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionGroupDto,
  ): Promise<PermissionGroup> {
    return this.groups.update(id, dto);
  }

  @Delete('permission-groups/:id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.groups.remove(id);
  }
}
