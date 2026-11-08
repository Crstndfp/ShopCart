import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import type { AddressRecord, CreateAddressPayload } from '../types/address.types.js';

export const addressApi = {
  async listAddresses(): Promise<AddressRecord[]> {
    const response = await apiRequest<ApiSuccessResponse<AddressRecord[]>>('/api/v1/addresses');
    return response.data;
  },

  async createAddress(
    payload: CreateAddressPayload
  ): Promise<{ idAddress: number; message: string }> {
    const response = await apiRequest<ApiSuccessResponse<{ idAddress: number; message: string }>>(
      '/api/v1/addresses',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
    return response.data;
  },
};
