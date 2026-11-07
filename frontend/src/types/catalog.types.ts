export interface CategoryItem {
  IDCategory: number;
  IDParentCategory: number | null;
  Name: string;
  Description: string | null;
  IsActive: boolean;
  CreatedAt: string;
  ActiveProductsCount?: number;
}

export interface CatalogProductSummary {
  IDProduct: number;
  ProductName: string;
  Description: string | null;
  MainImageUrl: string | null;
  IDCategory: number;
  CategoryName: string;
  MinPrice: number;
  MaxPrice: number;
  TotalPhysicalStock: number;
  TotalAvailableStock: number;
  CreatedAt: string;
  TotalRows?: number;
}

export interface ProductVariant {
  IDVariant: number;
  IDProduct: number;
  SKU: string;
  AttributesJson: string;
  Attributes?: Record<string, string>;
  Price: number;
  PhysicalStock: number;
  ReservedQuantity: number;
  AvailableStock: number;
  IsActive: boolean;
  CreatedAt: string;
}

export interface ProductDetail {
  IDProduct: number;
  IDCategory: number;
  CategoryName: string;
  ProductName: string;
  Description: string | null;
  MainImageUrl: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string | null;
  Variants: ProductVariant[];
}

export type CatalogSortBy = 'NAME' | 'PRICE' | 'NEWEST';
export type CatalogSortDir = 'ASC' | 'DESC';

export interface SearchProductsParams {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  onlyInStock?: boolean;
  sortBy?: CatalogSortBy;
  sortDir?: CatalogSortDir;
  page?: number;
  limit?: number;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedProductsResponse {
  statusCode: number;
  pagination: PaginationMetadata;
  data: CatalogProductSummary[];
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  parentCategoryId?: number;
}

export interface UpdateCategoryRequest {
  name: string;
  description?: string;
  parentCategoryId?: number;
  isActive: boolean;
}

export interface CreateProductRequest {
  categoryId: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
}

export interface UpdateProductRequest {
  categoryId: number;
  name: string;
  description?: string;
  mainImageUrl?: string;
  isActive: boolean;
}

export interface CreateVariantRequest {
  sku: string;
  attributes: Record<string, string>;
  price: number;
  initialStock: number;
}

export interface UpdateVariantRequest {
  attributes: Record<string, string>;
  price: number;
  isActive: boolean;
}

const gtqFormatter = new Intl.NumberFormat('es-GT', {
  style: 'currency',
  currency: 'GTQ',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatGTQ(amount: number | string | null | undefined): string {
  const numeric = typeof amount === 'string' ? Number.parseFloat(amount) : Number(amount ?? 0);
  if (Number.isNaN(numeric)) {
    return 'Q0.00';
  }
  return gtqFormatter.format(numeric);
}

export function formatPriceRangeGTQ(minPrice: number, maxPrice: number): string {
  if (minPrice === maxPrice || !maxPrice) {
    return formatGTQ(minPrice);
  }
  return `${formatGTQ(minPrice)} – ${formatGTQ(maxPrice)}`;
}

export function buildCatalogSearchQuery(params: SearchProductsParams): string {
  const searchParams = new URLSearchParams();

  if (params.search && params.search.trim().length > 0) {
    searchParams.set('search', params.search.trim());
  }
  if (params.categoryId && params.categoryId > 0) {
    searchParams.set('categoryId', String(params.categoryId));
  }
  if (params.minPrice !== undefined && !Number.isNaN(params.minPrice) && params.minPrice >= 0) {
    searchParams.set('minPrice', String(params.minPrice));
  }
  if (params.maxPrice !== undefined && !Number.isNaN(params.maxPrice) && params.maxPrice >= 0) {
    searchParams.set('maxPrice', String(params.maxPrice));
  }
  if (params.onlyInStock) {
    searchParams.set('onlyInStock', 'true');
  }
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }
  if (params.sortDir) {
    searchParams.set('sortDir', params.sortDir);
  }
  if (params.page && params.page >= 1) {
    searchParams.set('page', String(params.page));
  }
  if (params.limit && params.limit >= 1) {
    searchParams.set('limit', String(params.limit));
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export function parseVariantAttributes(
  variant: Pick<ProductVariant, 'Attributes' | 'AttributesJson'>
): Record<string, string> {
  if (variant.Attributes && typeof variant.Attributes === 'object') {
    return variant.Attributes;
  }
  if (typeof variant.AttributesJson === 'string' && variant.AttributesJson.trim().length > 0) {
    try {
      const parsed = JSON.parse(variant.AttributesJson) as Record<string, unknown>;
      const normalized: Record<string, string> = {};
      for (const [key, val] of Object.entries(parsed)) {
        normalized[key] = String(val);
      }
      return normalized;
    } catch {
      return {};
    }
  }
  return {};
}
