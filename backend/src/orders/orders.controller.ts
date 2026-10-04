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
  list(@Query() query: ListOrdersDto): Paginated<Order> {
    return paginate(this.orders.list(query), query);
  }

  /** Đặt trước `:id` — Nest khớp route theo thứ tự khai báo. */
  @Get('stats')
  stats(): OrderStats {
    return this.orders.stats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): OrderDetail {
    return this.orders.findOneOrFail(id);
  }

  @Post()
  create(@Body() dto: CreateOrderDto): OrderDetail {
    return this.orders.create(dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ): OrderDetail {
    return this.orders.updateStatus(id, dto);
  }

  @Patch(':id/payment')
  updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentStatusDto,
  ): OrderDetail {
    return this.orders.updatePayment(id, dto);
  }

  @Patch(':id/note')
  updateNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAdminNoteDto,
  ): OrderDetail {
    return this.orders.updateAdminNote(id, dto);
  }
}
