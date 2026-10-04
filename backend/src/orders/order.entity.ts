/**
 * Trạng thái xử lý đơn.
 *
 *   pending ──► confirmed ──► shipping ──► completed
 *      │            │  └────────────────────▲   (dịch vụ không cần giao hàng)
 *      └────────────┴───────► cancelled ◄────┘ (từ shipping)
 *
 * `completed` và `cancelled` là điểm cuối: đơn đã xong hoặc đã huỷ thì không
 * mở lại — cần thì tạo đơn mới, để số liệu doanh thu không bị đảo ngược âm thầm.
 */
export const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'shipping',
  'completed',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipping', 'completed', 'cancelled'],
  shipping: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const PAYMENT_STATUSES = ['unpaid', 'paid', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * `paid → unpaid` để sửa khi bấm nhầm; hoàn tiền chỉ có nghĩa khi đã thu.
 * `refunded` là điểm cuối.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  unpaid: ['paid'],
  paid: ['unpaid', 'refunded'],
  refunded: [],
};

export const PAYMENT_METHODS = ['cod', 'bank_transfer'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Giới hạn mỗi đơn — chặn request bất thường, không phải giới hạn kinh doanh. */
export const MAX_ORDER_LINES = 50;
export const MAX_LINE_QUANTITY = 99;

/**
 * Một dòng hàng. Tên, mã, giá là BẢN CHỤP lúc đặt: admin sửa giá hay xoá sản
 * phẩm sau đó thì đơn cũ vẫn đúng như khách đã đặt.
 */
export type OrderItem = {
  id: number;
  /** `null` khi sản phẩm đã bị xoá khỏi hệ thống. */
  productId: number | null;
  productName: string;
  productSlug: string | null;
  sku: string | null;
  image: string | null;
  /** Giá niêm yết lúc đặt. */
  listPrice: number;
  /** Giá khách trả cho mỗi đơn vị (khuyến mãi nếu có). */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export const ORDER_EVENT_TYPES = [
  'created',
  'status',
  'payment',
  'note',
] as const;
export type OrderEventType = (typeof ORDER_EVENT_TYPES)[number];

/** Một dòng lịch sử: ai làm gì, lúc nào. Chỉ thêm, không sửa, không xoá. */
export type OrderEvent = {
  id: number;
  type: OrderEventType;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  /** Tên/email admin, hoặc "Khách hàng" với sự kiện tạo đơn. */
  actor: string | null;
  createdAt: string;
};

export type Order = {
  id: number;
  /** Mã hiển thị cho khách: DH<yyMMdd>-<số thứ tự trong ngày>. */
  code: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  address: string | null;
  /** Ghi chú của khách khi đặt. */
  note: string | null;
  /** Email tài khoản nếu khách đăng nhập lúc đặt — để họ xem lại đơn. */
  userEmail: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  /** Tổng theo giá niêm yết. */
  subtotal: number;
  /** Tổng tiền được giảm nhờ khuyến mãi. */
  discount: number;
  /** Số khách phải trả = subtotal − discount. */
  total: number;
  /** Tổng số lượng hàng. */
  itemCount: number;
  /** Ghi chú nội bộ của admin, khách không thấy. */
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
};

/** Chi tiết đơn cho admin: kèm lịch sử. */
export type OrderDetail = Order & { events: OrderEvent[] };

export type OrderStats = {
  total: number;
  byStatus: Record<OrderStatus, number>;
  /** Doanh thu từ đơn đã hoàn thành. */
  revenue: number;
  /** Đơn tạo hôm nay (giờ máy chủ). */
  today: number;
};
