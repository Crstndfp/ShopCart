import sql from 'mssql';
import { getDbPool } from '../config/database.js';
import { OrderQueryDto } from '../dtos/order.dto.js';

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

export class OrderDal {
  public async createOrder(
    userId: number,
    cartId: number,
    addressId: number,
    idempotencyKey: string,
    couponCode: string | null
  ): Promise<{ idOrder: number; orderNumber: string }> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDUser', sql.Int, userId)
      .input('IDCart', sql.Int, cartId)
      .input('IDDeliveryAddress', sql.Int, addressId)
      .input('IdempotencyKey', sql.VarChar(100), idempotencyKey)
      .input('CouponCode', sql.VarChar(50), couponCode)
      .output('NewIDOrder', sql.Int)
      .output('GeneratedOrderNumber', sql.VarChar(30))
      .execute('dbo.SP_Orders_CreateOrder');

    return {
      idOrder: result.output.NewIDOrder as number,
      orderNumber: result.output.GeneratedOrderNumber as string,
    };
  }

  public async advanceStatus(
    orderId: number,
    newStatus: string,
    reason: string | null,
    userId: number
  ): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDOrder', sql.Int, orderId)
      .input('NewStatus', sql.VarChar(30), newStatus)
      .input('Reason', sql.NVarChar(255), reason)
      .input('IDUser', sql.Int, userId)
      .execute('dbo.SP_Orders_AdvanceStatus');
  }

  public async processReturn(
    orderId: number,
    orderItemId: number,
    quantity: number,
    reason: string,
    operatorUserId: number
  ): Promise<number> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDOrder', sql.Int, orderId)
      .input('IDOrderItem', sql.Int, orderItemId)
      .input('QuantityToReturn', sql.Int, quantity)
      .input('Reason', sql.NVarChar(255), reason)
      .input('IDOperatorUser', sql.Int, operatorUserId)
      .output('NewIDReturn', sql.Int)
      .execute('dbo.SP_Orders_ProcessReturn');

    return result.output.NewIDReturn as number;
  }

  public async getOrderById(
    orderId: number,
    requestingUserId: number,
    isStaff: boolean
  ): Promise<OrderDetailResult | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDOrder', sql.Int, orderId)
      .input('RequestingUserID', sql.Int, requestingUserId)
      .input('IsStaff', sql.Bit, isStaff)
      .execute('dbo.SP_Orders_GetOrderByID');

    const recordsets = result.recordsets as sql.IRecordSet<any>[];
    const header = recordsets[0]?.[0] as OrderHeaderRecord | undefined;
    if (!header) {
      return null;
    }

    const items = (recordsets[1] as OrderItemRecord[]) || [];
    const history = (recordsets[2] as OrderStatusHistoryRecord[]) || [];

    return {
      order: header,
      items,
      history,
    };
  }

  public async listOrders(
    userId: number | null,
    query: OrderQueryDto
  ): Promise<{ items: OrderListItem[]; total: number }> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDUser', sql.Int, userId)
      .input('Status', sql.VarChar(30), query.status ?? null)
      .input('StartDate', sql.DateTime2(3), query.startDate ? new Date(query.startDate) : null)
      .input('EndDate', sql.DateTime2(3), query.endDate ? new Date(query.endDate) : null)
      .input('PageNumber', sql.Int, query.page ?? 1)
      .input('PageSize', sql.Int, query.limit ?? 20)
      .execute('dbo.SP_Orders_List');

    const items = (result.recordset as OrderListItem[]) || [];
    const total = items.length > 0 ? ((items[0] as any).TotalRows as number) : 0;

    return { items, total };
  }

  public async releaseExpiredReservations(): Promise<number> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .output('ReleasedCount', sql.Int)
      .execute('dbo.SP_Inventory_ReleaseExpiredReservations');

    return (result.output.ReleasedCount as number) || 0;
  }
}
