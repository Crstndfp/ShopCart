import { apiRequest } from './http-client.js';
import type { ApiSuccessResponse } from '../types/auth.types.js';
import {
  buildCatalogSearchQuery,
  type CategoryItem,
  type CreateCategoryRequest,
  type CreateProductRequest,
  type CreateVariantRequest,
  type PaginatedProductsResponse,
  type ProductDetail,
  type SearchProductsParams,
  type UpdateCategoryRequest,
  type UpdateProductRequest,
  type UpdateVariantRequest,
} from '../types/catalog.types.js';

export const catalogApi = {
  // ==========================================
  // Categories
  // ==========================================
  async listCategories(onlyActive = true): Promise<CategoryItem[]> {
    const query = onlyActive ? '' : '?onlyActive=false';
    const response = await apiRequest<ApiSuccessResponse<CategoryItem[]>>(
      `/api/v1/catalog/categories${query}`
    );
    return response.data;
  },

  async createCategory(
    payload: CreateCategoryRequest
  ): Promise<{ idCategory: number; message: string }> {
    const response = await apiRequest<
      ApiSuccessResponse<{ idCategory: number; message: string }>
    >('/api/v1/catalog/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateCategory(
    idCategory: number,
    payload: UpdateCategoryRequest
  ): Promise<{ idCategory: number; message: string }> {
    const response = await apiRequest<
      ApiSuccessResponse<{ idCategory: number; message: string }>
    >(`/api/v1/catalog/categories/${idCategory}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  // ==========================================
  // Products
  // ==========================================
  async searchProducts(params: SearchProductsParams): Promise<PaginatedProductsResponse> {
    const queryString = buildCatalogSearchQuery(params);
    return apiRequest<PaginatedProductsResponse>(`/api/v1/catalog/products${queryString}`);
  },

  async getProductById(idProduct: number): Promise<ProductDetail> {
    const response = await apiRequest<ApiSuccessResponse<ProductDetail>>(
      `/api/v1/catalog/products/${idProduct}`
    );
    return response.data;
  },

  async createProduct(
    payload: CreateProductRequest
  ): Promise<{ idProduct: number; message: string }> {
    const response = await apiRequest<
      ApiSuccessResponse<{ idProduct: number; message: string }>
    >('/api/v1/catalog/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateProduct(
    idProduct: number,
    payload: UpdateProductRequest
  ): Promise<{ idProduct: number; message: string }> {
    const response = await apiRequest<
      ApiSuccessResponse<{ idProduct: number; message: string }>
    >(`/api/v1/catalog/products/${idProduct}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async deactivateProduct(idProduct: number): Promise<{ idProduct: number; message: string }> {
    const response = await apiRequest<
      ApiSuccessResponse<{ idProduct: number; message: string }>
    >(`/api/v1/catalog/products/${idProduct}`, {
      method: 'DELETE',
    });
    return response.data;
  },

  // ==========================================
  // Product Variants & Prices
  // ==========================================
  async createVariant(
    idProduct: number,
    payload: CreateVariantRequest
  ): Promise<{ idVariant: number; idProduct: number; message: string }> {
    const response = await apiRequest<
      ApiSuccessResponse<{ idVariant: number; idProduct: number; message: string }>
    >(`/api/v1/catalog/products/${idProduct}/variants`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  async updateVariant(
    idVariant: number,
    payload: UpdateVariantRequest
  ): Promise<{ idVariant: number; message: string }> {
    const response = await apiRequest<
      ApiSuccessResponse<{ idVariant: number; message: string }>
    >(`/api/v1/catalog/variants/${idVariant}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  // ==========================================
  // Quick Add to Cart (Integration with RF-04)
  // ==========================================
  async addItemToCart(variantId: number, quantity: number): Promise<{ message?: string }> {
    const response = await apiRequest<ApiSuccessResponse<{ message?: string }>>(
      '/api/v1/cart/items',
      {
        method: 'POST',
        body: JSON.stringify({ variantId, quantity }),
      }
    );
    return response.data ?? { message: response.message };
  },
};
