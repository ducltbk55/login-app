import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { matchesSearch } from '../common/search';
import { SqliteService } from '../database/sqlite.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import {
  UpdateAdminNoteDto,
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
} from './dto/update-order.dto';
import {
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  PAYMENT_TRANSITIONS,
  type Order,
  type OrderDetail,
  type OrderEvent,
  type OrderEventType,
  type OrderItem,
  type OrderStats,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from './order.entity';

type Id = number | bigint;

type OrderRow = {
  id: Id;
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string | null;
  note: string | null;
  userEmail: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  subtotal: Id;
  discount: Id;
  total: Id;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type ItemRow = {
  id: Id;
  orderId: Id;
  productId: Id | null;
  productName: string;
  productSlug: string | null;
  sku: string | null;
  image: string | null;
  listPrice: Id;
  unitPrice: Id;
  quantity: Id;
};

type EventRow = {
  id: Id;
  type: string;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  actor: string | null;
  createdAt: string;
};

/** Đúng các cột sản phẩm cần để chốt một dòng hàng. */
type ProductRow = {
  id: Id;
  slug: string;
  name: string;
  sku: string | null;
  image: string | null;
  price: Id | null;
  salePrice: Id | null;
  status: string;
  inStock: Id;
};

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function toItem(row: ItemRow): OrderItem {
  const unitPrice = Number(row.unitPrice);
  const quantity = Number(row.quantity);
  return {
    id: Number(row.id),
    productId: row.productId === null ? null : Number(row.productId),
    productName: row.productName,
    productSlug: row.productSlug,
    sku: row.sku,
    image: row.image,
    listPrice: Number(row.listPrice),
    unitPrice,
    quantity,
    lineTotal: unitPrice * quantity,
  };
}

function toEvent(row: EventRow): OrderEvent {
  return {
    id: Number(row.id),
    type: row.type as OrderEventType,
    fromValue: row.fromValue,
    toValue: row.toValue,
    note: row.note,
    actor: row.actor,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class OrdersService {
  constructor(private readonly sqlite: SqliteService) {}

  private toOrder(row: OrderRow, items: OrderItem[]): Order {
    return {
      id: Number(row.id),
      code: row.code,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      customerEmail: row.customerEmail,
      address: row.address,
      note: row.note,
      userEmail: row.userEmail,
      paymentMethod: row.paymentMethod as PaymentMethod,
      paymentStatus: row.paymentStatus as PaymentStatus,
      status: row.status as OrderStatus,
      subtotal: Number(row.subtotal),
      discount: Number(row.discount),
      total: Number(row.total),
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      adminNote: row.adminNote,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      items,
    };
  }

  /** Dòng hàng của nhiều đơn trong một truy vấn, gom theo đơn. */
  private itemsOf(orderIds: number[]): Map<number, OrderItem[]> {
    const byOrder = new Map<number, OrderItem[]>();
    if (orderIds.length === 0) return byOrder;

    const rows = this.sqlite.db
      .prepare(
        `SELECT * FROM order_items
          WHERE orderId IN (${orderIds.map(() => '?').join(', ')})
          ORDER BY id`,
      )
      .all(...orderIds) as ItemRow[];

    for (const row of rows) {
      const orderId = Number(row.orderId);
      const list = byOrder.get(orderId) ?? [];
      list.push(toItem(row));
      byOrder.set(orderId, list);
    }
    return byOrder;
  }

  list(query: ListOrdersDto = {}): Order[] {
    const where: string[] = [];
    const params: string[] = [];

    if (query.status) {
      where.push('status = ?');
      params.push(query.status);
    }
    if (query.paymentStatus) {
      where.push('paymentStatus = ?');
      params.push(query.paymentStatus);
    }
    if (query.userEmail) {
      where.push('userEmail = ? COLLATE NOCASE');
      params.push(query.userEmail);
    }

    let rows = this.sqlite.db
      .prepare(
        `SELECT * FROM orders
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY createdAt DESC, id DESC`,
      )
      .all(...params) as OrderRow[];

    // Lọc chữ trong JS vì SQLite dựng sẵn không bỏ dấu được — xem common/search.ts
    if (query.search) {
      const search = query.search;
      rows = rows.filter((row) =>
        matchesSearch(
          search,
          row.code,
          row.customerName,
          row.customerPhone,
          // Khách gõ "0905 123 456", admin tìm "0905123" — so cả dạng chỉ số.
          row.customerPhone.replace(/\D/g, ''),
          row.customerEmail,
        ),
      );
    }

    const items = this.itemsOf(rows.map((row) => Number(row.id)));
    return rows.map((row) =>
      this.toOrder(row, items.get(Number(row.id)) ?? []),
    );
  }

  findOne(id: number): OrderDetail | null {
    const row = this.sqlite.db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(id) as OrderRow | undefined;
    if (!row) return null;

    const events = (
      this.sqlite.db
        .prepare(
          'SELECT * FROM order_events WHERE orderId = ? ORDER BY createdAt, id',
        )
        .all(id) as EventRow[]
    ).map(toEvent);

    return {
      ...this.toOrder(row, this.itemsOf([id]).get(id) ?? []),
      events,
    };
  }

  findOneOrFail(id: number): OrderDetail {
    const order = this.findOne(id);
    if (!order) throw new NotFoundException(`Không có đơn hàng #${id}`);
    return order;
  }

  stats(): OrderStats {
    const rows = this.sqlite.db
      .prepare(
        `SELECT status, COUNT(*) AS n, SUM(total) AS amount
           FROM orders GROUP BY status`,
      )
      .all() as { status: string; n: Id; amount: Id | null }[];

    const byStatus = Object.fromEntries(
      ORDER_STATUSES.map((status) => [status, 0]),
    ) as Record<OrderStatus, number>;
    let revenue = 0;
    for (const row of rows) {
      byStatus[row.status as OrderStatus] = Number(row.n);
      if (row.status === 'completed') revenue = Number(row.amount ?? 0);
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = this.sqlite.db
      .prepare('SELECT COUNT(*) AS n FROM orders WHERE createdAt >= ?')
      .get(startOfDay.toISOString()) as { n: Id };

    return {
      total: Object.values(byStatus).reduce((sum, n) => sum + n, 0),
      byStatus,
      revenue,
      today: Number(today.n),
    };
  }

  /**
   * Đặt hàng. Giá, tên, tình trạng hàng đều đọc lại từ DB ngay trong
   * transaction — số tiền trên đơn là số server tính, không phải số trình
   * duyệt gửi lên.
   */
  create(dto: CreateOrderDto): OrderDetail {
    return this.sqlite.transaction(() => {
      // Cùng một sản phẩm xuất hiện hai lần thì gộp số lượng.
      const quantities = new Map<number, number>();
      for (const line of dto.items) {
        quantities.set(
          line.productId,
          (quantities.get(line.productId) ?? 0) + line.quantity,
        );
      }

      const ids = [...quantities.keys()];
      const products = new Map(
        (
          this.sqlite.db
            .prepare(
              `SELECT id, slug, name, sku, image, price, salePrice, status, inStock
                 FROM products WHERE id IN (${ids.map(() => '?').join(', ')})`,
            )
            .all(...ids) as ProductRow[]
        ).map((row) => [Number(row.id), row]),
      );

      const lines = ids.map((productId) => {
        const product = products.get(productId);
        if (!product || product.status !== 'published') {
          throw new BadRequestException(
            'Có sản phẩm trong giỏ đã ngừng bán. Vui lòng tải lại giỏ hàng.',
          );
        }
        if (Number(product.inStock) !== 1) {
          throw new BadRequestException(
            `"${product.name}" tạm hết hàng. Vui lòng bỏ khỏi giỏ để đặt các sản phẩm còn lại.`,
          );
        }
        if (product.price === null) {
          throw new BadRequestException(
            `"${product.name}" chưa có giá — vui lòng liên hệ để được báo giá.`,
          );
        }

        const listPrice = Number(product.price);
        const unitPrice =
          product.salePrice === null ? listPrice : Number(product.salePrice);
        // Giới hạn tổng vẫn đúng khi gộp hai dòng cùng sản phẩm.
        const quantity = Math.min(quantities.get(productId) ?? 1, 99);
        return { product, listPrice, unitPrice, quantity };
      });

      const subtotal = lines.reduce((s, l) => s + l.listPrice * l.quantity, 0);
      const total = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
      const now = new Date().toISOString();

      const result = this.sqlite.db
        .prepare(
          `INSERT INTO orders
             (code, customerName, customerPhone, customerEmail, address, note,
              userEmail, paymentMethod, paymentStatus, status,
              subtotal, discount, total, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'pending', ?, ?, ?, ?, ?)`,
        )
        .run(
          this.nextCode(),
          dto.customerName,
          dto.customerPhone,
          dto.customerEmail ?? null,
          dto.address ?? null,
          dto.note ?? null,
          dto.userEmail ?? null,
          dto.paymentMethod,
          subtotal,
          subtotal - total,
          total,
          now,
          now,
        );
      const orderId = Number(result.lastInsertRowid);

      const insertItem = this.sqlite.db.prepare(
        `INSERT INTO order_items
           (orderId, productId, productName, productSlug, sku, image,
            listPrice, unitPrice, quantity)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      for (const line of lines) {
        insertItem.run(
          orderId,
          Number(line.product.id),
          line.product.name,
          line.product.slug,
          line.product.sku,
          line.product.image,
          line.listPrice,
          line.unitPrice,
          line.quantity,
        );
      }

      this.addEvent(
        orderId,
        'created',
        null,
        'pending',
        dto.note ?? null,
        dto.customerName,
      );
      return this.findOneOrFail(orderId);
    });
  }

  updateStatus(id: number, dto: UpdateOrderStatusDto): OrderDetail {
    return this.sqlite.transaction(() => {
      const order = this.findOneOrFail(id);
      if (order.status === dto.status) return order;

      if (!ORDER_TRANSITIONS[order.status].includes(dto.status)) {
        throw new BadRequestException(
          `Không chuyển được đơn từ "${order.status}" sang "${dto.status}"`,
        );
      }
      if (dto.status === 'cancelled' && !dto.note) {
        throw new BadRequestException('Huỷ đơn cần ghi rõ lý do');
      }

      this.sqlite.db
        .prepare('UPDATE orders SET status = ?, updatedAt = ? WHERE id = ?')
        .run(dto.status, new Date().toISOString(), id);
      this.addEvent(
        id,
        'status',
        order.status,
        dto.status,
        dto.note ?? null,
        dto.actor ?? null,
      );

      return this.findOneOrFail(id);
    });
  }

  updatePayment(id: number, dto: UpdatePaymentStatusDto): OrderDetail {
    return this.sqlite.transaction(() => {
      const order = this.findOneOrFail(id);
      if (order.paymentStatus === dto.paymentStatus) return order;

      if (
        !PAYMENT_TRANSITIONS[order.paymentStatus].includes(dto.paymentStatus)
      ) {
        throw new BadRequestException(
          `Không chuyển được thanh toán từ "${order.paymentStatus}" sang "${dto.paymentStatus}"`,
        );
      }

      this.sqlite.db
        .prepare(
          'UPDATE orders SET paymentStatus = ?, updatedAt = ? WHERE id = ?',
        )
        .run(dto.paymentStatus, new Date().toISOString(), id);
      this.addEvent(
        id,
        'payment',
        order.paymentStatus,
        dto.paymentStatus,
        dto.note ?? null,
        dto.actor ?? null,
      );

      return this.findOneOrFail(id);
    });
  }

  updateAdminNote(id: number, dto: UpdateAdminNoteDto): OrderDetail {
    return this.sqlite.transaction(() => {
      const order = this.findOneOrFail(id);
      const adminNote = dto.adminNote ?? null;
      if (order.adminNote === adminNote) return order;

      this.sqlite.db
        .prepare('UPDATE orders SET adminNote = ?, updatedAt = ? WHERE id = ?')
        .run(adminNote, new Date().toISOString(), id);
      this.addEvent(
        id,
        'note',
        null,
        null,
        adminNote ?? '(xoá ghi chú)',
        dto.actor ?? null,
      );

      return this.findOneOrFail(id);
    });
  }

  private addEvent(
    orderId: number,
    type: OrderEventType,
    fromValue: string | null,
    toValue: string | null,
    note: string | null,
    actor: string | null,
  ): void {
    this.sqlite.db
      .prepare(
        `INSERT INTO order_events
           (orderId, type, fromValue, toValue, note, actor, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        orderId,
        type,
        fromValue,
        toValue,
        note,
        actor,
        new Date().toISOString(),
      );
  }

  /**
   * DH<yyMMdd>-<thứ tự trong ngày, 4 chữ số> theo giờ máy chủ. Gọi trong
   * transaction nên hai đơn cùng lúc không lấy trùng số (SQLite ghi tuần tự,
   * và cột `code` còn có ràng buộc UNIQUE chặn thêm một lớp).
   */
  private nextCode(): string {
    const now = new Date();
    const prefix = `DH${pad(now.getFullYear() % 100)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-`;
    const row = this.sqlite.db
      .prepare(
        `SELECT code FROM orders WHERE code LIKE ? ORDER BY code DESC LIMIT 1`,
      )
      .get(`${prefix}%`) as { code: string } | undefined;

    const last = row ? Number(row.code.slice(prefix.length)) : 0;
    return `${prefix}${pad(last + 1, 4)}`;
  }
}
