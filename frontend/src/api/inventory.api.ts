import { apiRequest } from './http-client.js';
import type {
  AdjustStockPayload,
  KardexFilters,
  KardexResponse,
  StockFilters,
  StockOverviewResponse,
} from '../types/inventory.types.js';

export const inventoryApi = {
  async getStockOverview(filters: StockFilters = {}): Promise<StockOverviewResponse> {
    const params = new URLSearchParams();
    if (filters.search?.trim()) {
      params.set('search', filters.search.trim());
    }
    if (filters.idCategory) {
      params.set('idCategory', filters.idCategory.toString());
    }
    if (filters.lowStockOnly !== undefined) {
      params.set('lowStockOnly', filters.lowStockOnly ? 'true' : 'false');
    }
    if (filters.page) {
      params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params.set('limit', filters.limit.toString());
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<StockOverviewResponse>(`/api/v1/inventory/stock${query}`);
  },

  async getKardex(filters: KardexFilters = {}): Promise<KardexResponse> {
    const params = new URLSearchParams();
    if (filters.idVariant) {
      params.set('idVariant', filters.idVariant.toString());
    }
    if (filters.movementType?.trim()) {
      params.set('movementType', filters.movementType.trim());
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
    return apiRequest<KardexResponse>(`/api/v1/inventory/kardex${query}`);
  },

  async adjustStock(payload: AdjustStockPayload): Promise<{ statusCode: number; message: string }> {
    return apiRequest<{ statusCode: number; message: string }>('/api/v1/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
