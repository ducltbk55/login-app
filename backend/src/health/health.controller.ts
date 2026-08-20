import { Controller, Get } from '@nestjs/common';

import { UsersService } from '../users/users.service';

@Controller('health')
export class HealthController {
  constructor(private readonly users: UsersService) {}

  @Get()
  check(): { status: 'ok'; users: number; uptime: number } {
    return {
      status: 'ok',
      users: this.users.countAll(),
      uptime: Math.round(process.uptime()),
    };
  }
}
