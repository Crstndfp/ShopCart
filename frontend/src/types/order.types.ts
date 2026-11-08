export interface OrderHeaderRecord {
  IDOrder: number;
  OrderNumber: string;
  IDUser: number;
  CustomerName: string;
  CustomerEmail: string;
  IDCart: number;
  IDDeliveryAddress: number;
  ShippingAddressSnapshot: string;
  NetSubtotal: number;
  IVATaxAmount: number;
  DiscountTotal: number;
  GrandTotal: number;
  IDCoupon: number | null;
  CouponCode: string | null;
  Status: string;
  IdempotencyKey: string;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export interface OrderItemRecord {
  IDOrderItem: number;
  IDVariant: number;
  HistoricalSKU: string;
  HistoricalProductName: string;
  UnitPrice: number;
  QuantitySold: number;
  QuantityReturned: number;
  LineTotal: number;
}

export interface OrderStatusHistoryRecord {
  IDOrderStatusHistory: number;
  PreviousStatus: string | null;
  NewStatus: string;
  ChangedAt: string;
  Reason: string | null;
  ChangedByUserName: string;
}

export interface OrderDetailResult {
  order: OrderHeaderRecord;
  items: OrderItemRecord[];
  history: OrderStatusHistoryRecord[];
}

export interface OrderListItem {
  IDOrder: number;
  OrderNumber: string;
  IDUser: number;
  CustomerName: string;
  CustomerEmail: string;
  NetSubtotal: number;
  IVATaxAmount: number;
  DiscountTotal: number;
  GrandTotal: number;
  Status: string;
  CreatedAt: string;
  UpdatedAt: string | null;
  ItemCount: number;
}

export interface CheckoutPayload {
  idDeliveryAddress: number;
  couponCode?: string | null;
}

export interface OrderQueryFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface OrderListResponse {
  statusCode: number;
  items: OrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderStatusMeta {
  label: string;
  badgeClass: string;
}

export const ORDER_STATUS_META: Record<string, OrderStatusMeta> = {
  PAID: {
    label: 'Pagado / Confirmado',
    badgeClass: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300',
  },
  IN_PREPARATION: {
    label: 'En Preparación',
    badgeClass: 'border-amber-500/40 bg-amber-950/80 text-amber-300',
  },
  DISPATCHED: {
    label: 'Despachado en Ruta',
    badgeClass: 'border-sky-500/40 bg-sky-950/80 text-sky-300',
  },
  DELIVERED: {
    label: 'Entregado al Cliente',
    badgeClass: 'border-teal-500/40 bg-teal-950/80 text-teal-300',
  },
  CANCELLED: {
    label: 'Cancelado',
    badgeClass: 'border-crimson-600/40 bg-crimson-950/80 text-red-300',
  },
  PARTIALLY_RETURNED: {
    label: 'Devolución Parcial',
    badgeClass: 'border-orange-500/40 bg-orange-950/80 text-orange-300',
  },
  FULLY_RETURNED: {
    label: 'Devolución Total',
    badgeClass: 'border-red-600/40 bg-red-950/80 text-red-300',
  },
};

export function getOrderStatusMeta(status: string): OrderStatusMeta {
  return (
    ORDER_STATUS_META[status] || {
      label: status,
      badgeClass: 'border-slate-500/40 bg-slate-900/80 text-slate-300',
    }
  );
}

export function parseShippingAddressSnapshot(
  snapshotJson: string
): Record<string, string> | null {
  try {
    return JSON.parse(snapshotJson);
  } catch {
    return null;
  }
}
