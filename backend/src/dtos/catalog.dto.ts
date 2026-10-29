import { z } from 'zod';

// ==========================================
// Category DTOs
// ==========================================
export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must have at least 2 characters').max(100),
  description: z.string().max(255).optional(),
  parentCategoryId: z.coerce.number().optional(),
});

export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().min(2, 'Category name must have at least 2 characters').max(100),
  description: z.string().max(255).optional(),
  parentCategoryId: z.coerce.number().optional(),
  isActive: z.boolean(),
});

export type UpdateCategoryDto = z.infer<typeof updateCategorySchema>;

// ==========================================
// Product DTOs
// ==========================================
export const createProductSchema = z.object({
  categoryId: z.coerce.number().min(1, 'Category ID is required'),
  name: z.string().min(2, 'Product name must have at least 2 characters').max(150),
  description: z.string().optional(),
  mainImageUrl: z.string().url('Invalid image URL format').optional(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;

export const updateProductSchema = z.object({
  categoryId: z.coerce.number().min(1, 'Category ID is required'),
  name: z.string().min(2, 'Product name must have at least 2 characters').max(150),
  description: z.string().optional(),
  mainImageUrl: z.string().url('Invalid image URL format').optional(),
  isActive: z.boolean(),
});

export type UpdateProductDto = z.infer<typeof updateProductSchema>;

// ==========================================
// Product Variant DTOs
// ==========================================
export const createVariantSchema = z.object({
  sku: z.string().min(3, 'SKU must have at least 3 characters').max(50),
  attributes: z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length > 0, {
    message: 'Attributes must contain at least one key-value pair (e.g. size, color)',
  }),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  initialStock: z.coerce.number().int().min(0, 'Initial stock cannot be negative').default(0),
});

export type CreateVariantDto = z.infer<typeof createVariantSchema>;

export const updateVariantSchema = z.object({
  attributes: z.record(z.string(), z.string()).refine((obj) => Object.keys(obj).length > 0, {
    message: 'Attributes must contain at least one key-value pair',
  }),
  price: z.coerce.number().min(0, 'Price cannot be negative'),
  isActive: z.boolean(),
});

export type UpdateVariantDto = z.infer<typeof updateVariantSchema>;

// ==========================================
// Search Products Query DTO
// ==========================================
export const searchProductsQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  onlyInStock: z
    .preprocess((val) => (val === 'true' || val === true ? true : false), z.boolean())
    .optional(),
  sortBy: z.enum(['NAME', 'PRICE', 'NEWEST']).default('NAME'),
  sortDir: z.enum(['ASC', 'DESC']).default('ASC'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchProductsQueryDto = z.infer<typeof searchProductsQuerySchema>;
