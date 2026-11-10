import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import type {
  AuditLogFilters,
  AuditLogListResponse,
  ConfigurationItem,
  UpdateConfigurationPayload,
} from '../types/audit.types.js';

export const auditApi = {
  // List Audit Logs
  async listLogs(filters: AuditLogFilters = {}): Promise<AuditLogListResponse> {
    const params = new URLSearchParams();
    if (filters.module?.trim()) {
      params.set('module', filters.module.trim());
    }
    if (filters.entityName?.trim()) {
      params.set('entityName', filters.entityName.trim());
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
    return apiRequest<AuditLogListResponse>(`/api/v1/audit/logs${query}`);
  },

  // Get Configuration by Key
  async getConfiguration(key: string): Promise<ConfigurationItem> {
    const res = await apiRequest<ApiSuccessResponse<ConfigurationItem>>(
      `/api/v1/configurations/${key}`
    );
    return res.data;
  },

  // Update Configuration by Key
  async updateConfiguration(
    key: string,
    payload: UpdateConfigurationPayload
  ): Promise<ConfigurationItem> {
    const res = await apiRequest<ApiSuccessResponse<ConfigurationItem>>(
      `/api/v1/configurations/${key}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },
};
