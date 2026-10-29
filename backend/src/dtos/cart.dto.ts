import { z } from 'zod';

export const addItemToCartSchema = z.object({
  variantId: z.coerce.number().int().min(1, 'Valid variantId is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
});

export type AddItemToCartDto = z.infer<typeof addItemToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(0, 'Quantity cannot be negative'),
});

export type UpdateCartItemDto = z.infer<typeof updateCartItemSchema>;

export const mergeCartSchema = z.object({
  guestToken: z.string().min(10, 'Valid guest token is required'),
});

export type MergeCartDto = z.infer<typeof mergeCartSchema>;
