import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import type {
  CouponListResponse,
  CouponQueryFilters,
  CouponRecord,
  CouponValidationResult,
  CreateCouponPayload,
  UpdateCouponPayload,
} from '../types/coupon.types.js';

export const couponApi = {
  // Client/Checkout: Validate and preview coupon
  async validateCoupon(code: string, eligibleSubtotal: number): Promise<CouponValidationResult> {
    const response = await apiRequest<ApiSuccessResponse<CouponValidationResult>>(
      '/api/v1/coupons/validate',
      {
        method: 'POST',
        body: JSON.stringify({ code: code.trim().toUpperCase(), eligibleSubtotal }),
      }
    );
    return response.data;
  },

  // Admin: List coupons with pagination and filters
  async listCoupons(filters: CouponQueryFilters = {}): Promise<CouponListResponse> {
    const params = new URLSearchParams();
    if (filters.onlyActive !== undefined) {
      params.set('onlyActive', filters.onlyActive ? 'true' : 'false');
    }
    if (filters.page) {
      params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params.set('limit', filters.limit.toString());
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<CouponListResponse>(`/api/v1/coupons${query}`);
  },

  // Admin: Get coupon by ID
  async getCouponById(id: number): Promise<CouponRecord> {
    const response = await apiRequest<ApiSuccessResponse<CouponRecord>>(`/api/v1/coupons/${id}`);
    return response.data;
  },

  // Admin: Create new coupon
  async createCoupon(payload: CreateCouponPayload): Promise<CouponRecord> {
    const response = await apiRequest<ApiSuccessResponse<CouponRecord>>('/api/v1/coupons', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  // Admin: Update coupon
  async updateCoupon(id: number, payload: UpdateCouponPayload): Promise<CouponRecord> {
    const response = await apiRequest<ApiSuccessResponse<CouponRecord>>(`/api/v1/coupons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  // Admin: Deactivate coupon
  async deactivateCoupon(id: number): Promise<{ statusCode: number; message: string }> {
    return apiRequest<{ statusCode: number; message: string }>(`/api/v1/coupons/${id}`, {
      method: 'DELETE',
    });
  },
};
