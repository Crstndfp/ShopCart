import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import type {
  CreateUserAdminPayload,
  UpdateUserRolePayload,
  UpdateUserStatusPayload,
  UserListResponse,
  UserQueryFilters,
  UserRecord,
} from '../types/user-admin.types.js';

export const userAdminApi = {
  // List system users with pagination and search
  async listUsers(filters: UserQueryFilters = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (filters.page) {
      params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params.set('limit', filters.limit.toString());
    }
    if (filters.role) {
      params.set('role', filters.role);
    }
    if (filters.q?.trim()) {
      params.set('q', filters.q.trim());
    }
    if (filters.isActive !== undefined) {
      params.set('isActive', filters.isActive ? 'true' : 'false');
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiRequest<{
      statusCode: number;
      pagination?: { page: number; limit: number; total: number; totalPages: number };
      data?: UserRecord[];
      items?: UserRecord[];
      total?: number;
    }>(`/api/v1/users${query}`);

    const items = response.data ?? response.items ?? [];
    const total = response.pagination?.total ?? response.total ?? items.length;

    return {
      statusCode: response.statusCode ?? 200,
      items,
      total,
    };
  },

  // Get user by ID
  async getUserById(id: number): Promise<UserRecord> {
    const res = await apiRequest<ApiSuccessResponse<UserRecord>>(`/api/v1/users/${id}`);
    return res.data;
  },

  // Create Operator, Administrator or Client
  async createUser(payload: CreateUserAdminPayload): Promise<UserRecord> {
    const res = await apiRequest<ApiSuccessResponse<UserRecord>>('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // Update user role
  async updateRole(id: number, payload: UpdateUserRolePayload): Promise<UserRecord> {
    const res = await apiRequest<ApiSuccessResponse<UserRecord>>(
      `/api/v1/users/${id}/role`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },

  // Update user status (Active / Inactive with reason)
  async updateStatus(id: number, payload: UpdateUserStatusPayload): Promise<UserRecord> {
    const res = await apiRequest<ApiSuccessResponse<UserRecord>>(
      `/api/v1/users/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
    return res.data;
  },
};
