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
import type { PermissionDef } from '../common/permissions';
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
  permissions(): { items: PermissionDef[] } {
    return { items: this.catalog.list() };
  }

  @Get('permission-groups')
  list(): { total: number; items: PermissionGroup[] } {
    const items = this.groups.list();
    return { total: items.length, items };
  }

  @Get('permission-groups/:id')
  findOne(@Param('id', ParseIntPipe) id: number): PermissionGroup {
    return this.groups.findOneOrFail(id);
  }

  @Post('permission-groups')
  create(@Body() dto: CreatePermissionGroupDto): PermissionGroup {
    return this.groups.create(dto);
  }

  @Patch('permission-groups/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePermissionGroupDto,
  ): PermissionGroup {
    return this.groups.update(id, dto);
  }

  @Delete('permission-groups/:id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number): void {
    this.groups.remove(id);
  }
}
