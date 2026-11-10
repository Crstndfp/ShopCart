import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import type {
  AddItemToCartRequest,
  CartData,
  MergeCartRequest,
  UpdateItemQuantityRequest,
} from '../types/cart.types.js';

export const cartApi = {
  async getCart(): Promise<CartData> {
    const response = await apiRequest<ApiSuccessResponse<CartData>>('/api/v1/cart');
    return response.data;
  },

  async addItem(payload: AddItemToCartRequest): Promise<CartData> {
    const response = await apiRequest<ApiSuccessResponse<CartData>>('/api/v1/cart/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateItemQuantity(variantId: number, quantity: number): Promise<CartData> {
    const response = await apiRequest<ApiSuccessResponse<CartData>>(
      `/api/v1/cart/items/${variantId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ quantity } satisfies UpdateItemQuantityRequest),
      }
    );
    return response.data;
  },

  async removeItem(variantId: number): Promise<CartData> {
    const response = await apiRequest<ApiSuccessResponse<CartData>>(
      `/api/v1/cart/items/${variantId}`,
      {
        method: 'DELETE',
      }
    );
    return response.data;
  },

  async clearCart(): Promise<{ message: string }> {
    const response = await apiRequest<ApiSuccessResponse<{ message: string }>>('/api/v1/cart', {
      method: 'DELETE',
    });
    return response.data;
  },

  async mergeCart(payload: MergeCartRequest): Promise<CartData> {
    const response = await apiRequest<ApiSuccessResponse<CartData>>('/api/v1/cart/merge', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
};
