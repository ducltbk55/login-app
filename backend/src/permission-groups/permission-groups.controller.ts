import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import { PERMISSIONS } from '../common/permissions';
import {
  CreatePermissionGroupDto,
  UpdatePermissionGroupDto,
} from './dto/save-permission-group.dto';
import type { PermissionGroup } from './permission-group.entity';
import { PermissionGroupsService } from './permission-groups.service';

@Controller()
@UseGuards(ApiKeyGuard)
export class PermissionGroupsController {
  constructor(private readonly groups: PermissionGroupsService) {}

  /** Danh mục quyền cố định của hệ thống, để admin render checkbox. */
  @Get('permissions')
  catalog(): { items: typeof PERMISSIONS } {
    return { items: PERMISSIONS };
  }

  @Get('permission-groups')
  list(): { total: number; items: PermissionGroup[] } {
    const items = this.groups.list();
    return { total: items.length, items };
  }

  @Get('permission-groups/:id')
  findOne(@Param('id') id: string): PermissionGroup {
    return this.groups.findOneOrFail(id);
  }

  @Post('permission-groups')
  create(@Body() dto: CreatePermissionGroupDto): PermissionGroup {
    return this.groups.create(dto);
  }

  @Patch('permission-groups/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionGroupDto,
  ): PermissionGroup {
    return this.groups.update(id, dto);
  }

  @Delete('permission-groups/:id')
  @HttpCode(204)
  remove(@Param('id') id: string): void {
    this.groups.remove(id);
  }
}
