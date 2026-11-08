import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import type {
  CheckoutPayload,
  OrderDetailResult,
  OrderListResponse,
  OrderQueryFilters,
} from '../types/order.types.js';

export const orderApi = {
  // Checkout (Atomic order creation with stock reservation and mandatory Idempotency-Key)
  async checkout(payload: CheckoutPayload, idempotencyKey: string): Promise<OrderDetailResult> {
    const response = await apiRequest<ApiSuccessResponse<OrderDetailResult>>(
      '/api/v1/orders/checkout',
      {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },

  // List orders (Customer views own; Staff views all)
  async listOrders(filters: OrderQueryFilters = {}): Promise<OrderListResponse> {
    const params = new URLSearchParams();
    if (filters.status) {
      params.set('status', filters.status);
    }
    if (filters.startDate) {
      params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.set('endDate', filters.endDate);
    }
    if (filters.page) {
      params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params.set('limit', filters.limit.toString());
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<OrderListResponse>(`/api/v1/orders${query}`);
  },

  // Get order by ID
  async getOrderById(id: number): Promise<OrderDetailResult> {
    const response = await apiRequest<ApiSuccessResponse<OrderDetailResult>>(
      `/api/v1/orders/${id}`
    );
    return response.data;
  },
};
