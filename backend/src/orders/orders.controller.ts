import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { ApiKeyGuard } from '../common/api-key.guard';
import { paginate, type Paginated } from '../common/pagination';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import {
  UpdateAdminNoteDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/update-order.dto';
import type { Order, OrderDetail, OrderStats } from './order.entity';
import { OrdersService } from './orders.service';

/**
 * Đơn hàng. Không có endpoint xoá: đơn là chứng từ — sai thì huỷ, và lịch sử
 * vẫn còn đó để đối chiếu.
 */
@Controller('orders')
@UseGuards(ApiKeyGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  async list(@Query() query: ListOrdersDto): Promise<Paginated<Order>> {
    return paginate(await this.orders.list(query), query);
  }

  /** Đặt trước `:id` — Nest khớp route theo thứ tự khai báo. */
  @Get('stats')
  async stats(): Promise<OrderStats> {
    return this.orders.stats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<OrderDetail> {
    return this.orders.findOneOrFail(id);
  }

  @Post()
  async create(@Body() dto: CreateOrderDto): Promise<OrderDetail> {
    return this.orders.create(dto);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderDetail> {
    return this.orders.updateStatus(id, dto);
  }

  @Patch(':id/payment')
  async updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ): Promise<OrderDetail> {
    return this.orders.updatePayment(id, dto);
  }

  @Patch(':id/note')
  async updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminNoteDto,
  ): Promise<OrderDetail> {
    return this.orders.updateAdminNote(id, dto);
  }
}
