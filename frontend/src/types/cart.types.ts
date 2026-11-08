export interface CartItem {
  IDCartItem: number;
  IDVariant: number;
  SKU: string;
  ProductName: string;
  MainImageUrl: string | null;
  AttributesJson: string | null;
  UnitPrice: number;
  Quantity: number;
  LineTotal: number;
  AvailableStock: number;
  Attributes?: Record<string, string>;
}

export interface CartHeader {
  IDCart: number;
  IDUser: number | null;
  GuestToken: string | null;
  Status: string;
  LastActivityAt?: string;
  GrossSubtotal: number;
  NetSubtotal: number;
  IVATaxAmount: number;
  Total: number;
}

export interface CartData {
  cart: CartHeader;
  items: CartItem[];
}

export interface AddItemToCartRequest {
  variantId: number;
  quantity: number;
}

export interface UpdateItemQuantityRequest {
  quantity: number;
}

export interface MergeCartRequest {
  guestToken: string;
}

export function calculateCartItemCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.Quantity, 0);
}

export function formatCartItemAttributes(attributes?: Record<string, string>): string {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');
}
