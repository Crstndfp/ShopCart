import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import type {
  AbandonedCartItem,
  SalesByCategoryItem,
  SalesSummaryFilters,
  SalesSummaryItem,
  TopProductsFilters,
  TopSellingProductItem,
} from '../types/report.types.js';

export const reportApi = {
  // Get Sales Summary (aggregated daily sales, orders count, ticket promedio)
  async getSalesSummary(filters: SalesSummaryFilters = {}): Promise<SalesSummaryItem[]> {
    const params = new URLSearchParams();
    if (filters.startDate) {
      params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params.set('endDate', filters.endDate);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<ApiSuccessResponse<SalesSummaryItem[]>>(
      `/api/v1/reports/sales-summary${query}`
    );
    return res.data;
  },

  // Get Sales By Category (breakdown of gross, refunds, net and units sold per category)
  async getSalesByCategory(): Promise<SalesByCategoryItem[]> {
    const res = await apiRequest<ApiSuccessResponse<SalesByCategoryItem[]>>(
      '/api/v1/reports/sales-by-category'
    );
    return res.data;
  },

  // Get Top Selling Products (ranking by net revenue and units sold)
  async getTopSellingProducts(filters: TopProductsFilters = {}): Promise<TopSellingProductItem[]> {
    const params = new URLSearchParams();
    if (filters.limit) {
      params.set('limit', filters.limit.toString());
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<ApiSuccessResponse<TopSellingProductItem[]>>(
      `/api/v1/reports/top-products${query}`
    );
    return res.data;
  },

  // Get Abandoned Carts (> 24 hours inactive without conversion)
  async getAbandonedCarts(): Promise<AbandonedCartItem[]> {
    const res = await apiRequest<ApiSuccessResponse<AbandonedCartItem[]>>(
      '/api/v1/reports/abandoned-carts'
    );
    return res.data;
  },
};
