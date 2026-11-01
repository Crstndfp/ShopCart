import { OrderDal, OrderDetailResult, OrderListItem } from '../dal/order.dal.js';
import { CheckoutDto, AdvanceOrderStatusDto, ProcessReturnDto, OrderQueryDto } from '../dtos/order.dto.js';
import { NotFoundError, BadRequestError, ForbiddenError } from '../errors/app-error.js';

const STAFF_ROLES = ['ADMINISTRATOR', 'OPERATOR', 'INVENTORY_MANAGER'];

export class OrderService {
  private dal = new OrderDal();

  public async checkout(
    userId: number,
    cartId: number,
    dto: CheckoutDto,
    idempotencyKey: string
  ): Promise<OrderDetailResult> {
    if (!idempotencyKey || idempotencyKey.trim().length === 0) {
      throw new BadRequestError('Idempotency-Key header is required for checkout.');
    }

    try {
      const { idOrder } = await this.dal.createOrder(
        userId,
        cartId,
        dto.idDeliveryAddress,
        idempotencyKey.trim(),
        dto.couponCode ?? null
      );

      const orderDetail = await this.dal.getOrderById(idOrder, userId, false);
      if (!orderDetail) {
        throw new NotFoundError(`Order ${idOrder} created but details could not be retrieved.`);
      }

      return orderDetail;
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('INVALID_ADDRESS')) {
        throw new BadRequestError('Delivery address does not exist or does not belong to the user.');
      }
      if (msg.includes('EMPTY_CART')) {
        throw new BadRequestError('Cannot checkout an empty shopping cart.');
      }
      if (msg.includes('INSUFFICIENT_STOCK')) {
        throw new BadRequestError('One or more items in your cart do not have sufficient available stock.');
      }
      if (msg.includes('INVALID_COUPON') || msg.includes('COUPON_REJECTED')) {
        throw new BadRequestError(msg.replace(/^.*?:\s*/, ''));
      }
      throw error;
    }
  }

  public async advanceStatus(
    orderId: number,
    dto: AdvanceOrderStatusDto,
    userId: number
  ): Promise<OrderDetailResult> {
    try {
      await this.dal.advanceStatus(orderId, dto.status, dto.reason ?? null, userId);
      const updated = await this.dal.getOrderById(orderId, userId, true);
      return updated!;
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('ORDER_NOT_FOUND')) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`);
      }
      if (msg.includes('INVALID_STATUS_TRANSITION')) {
        throw new BadRequestError(msg.replace(/^.*?:\s*/, ''));
      }
      throw error;
    }
  }

  public async processReturn(
    orderId: number,
    dto: ProcessReturnDto,
    operatorUserId: number
  ): Promise<{ idReturn: number; order: OrderDetailResult }> {
    try {
      const idReturn = await this.dal.processReturn(
        orderId,
        dto.idOrderItem,
        dto.quantity,
        dto.reason,
        operatorUserId
      );

      const order = await this.dal.getOrderById(orderId, operatorUserId, true);
      return { idReturn, order: order! };
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('RETURN_NOT_ALLOWED') || msg.includes('RETURN_QUANTITY_EXCEEDED')) {
        throw new BadRequestError(msg.replace(/^.*?:\s*/, ''));
      }
      if (msg.includes('ITEM_NOT_FOUND')) {
        throw new NotFoundError(`Order item ${dto.idOrderItem} not found in order ${orderId}.`);
      }
      throw error;
    }
  }

  public async getOrderById(
    orderId: number,
    requestingUserId: number,
    userRole: string
  ): Promise<OrderDetailResult> {
    const isStaff = STAFF_ROLES.includes(userRole);
    try {
      const order = await this.dal.getOrderById(orderId, requestingUserId, isStaff);
      if (!order) {
        throw new NotFoundError(`Order with ID ${orderId} not found.`);
      }
      return order;
    } catch (error: any) {
      if (error.message?.includes('FORBIDDEN_ACCESS')) {
        throw new ForbiddenError('You do not have permission to view this order.');
      }
      throw error;
    }
  }

  public async listOrders(
    requestingUserId: number,
    userRole: string,
    query: OrderQueryDto
  ): Promise<{ items: OrderListItem[]; total: number; page: number; limit: number }> {
    const isStaff = STAFF_ROLES.includes(userRole);
    // If not staff, enforce customer isolation: only view own orders
    const targetUserId = isStaff ? null : requestingUserId;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { items, total } = await this.dal.listOrders(targetUserId, query);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
