export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';

export interface CouponRecord {
  IDCoupon: number;
  Code: string;
  DiscountType: DiscountType;
  DiscountValue: number;
  MinPurchaseAmount: number;
  StartDate: string;
  EndDate: string;
  MaxTotalUses: number;
  CurrentUses: number;
  MaxUsesPerClient: number;
  IDCategory: number | null;
  CategoryName: string | null;
  IsActive: boolean;
  CreatedAt: string;
}

export interface CouponValidationResult {
  idCoupon: number | null;
  code: string;
  validationStatus:
    | 'VALID'
    | 'COUPON_NOT_FOUND'
    | 'INACTIVE'
    | 'NOT_STARTED'
    | 'EXPIRED'
    | 'MIN_AMOUNT_NOT_MET'
    | 'MAX_USES_REACHED'
    | 'MAX_CLIENT_USES_REACHED'
    | string;
  calculatedDiscount: number;
}

export interface CreateCouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount: number;
  startDate: string;
  endDate: string;
  maxTotalUses: number;
  maxUsesPerClient: number;
  idCategory?: number | null;
}

export interface UpdateCouponPayload {
  discountType: DiscountType;
  discountValue: number;
  minPurchaseAmount: number;
  startDate: string;
  endDate: string;
  maxTotalUses: number;
  maxUsesPerClient: number;
  idCategory?: number | null;
  isActive: boolean;
}

export interface CouponQueryFilters {
  onlyActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CouponListResponse {
  statusCode: number;
  items: CouponRecord[];
  total: number;
  page: number;
  limit: number;
}

export function formatCouponStatusMessage(
  status: string,
  minAmount = 0
): { message: string; isValid: boolean } {
  switch (status) {
    case 'VALID':
      return {
        message: '¡Cupón de descuento aplicado exitosamente!',
        isValid: true,
      };
    case 'COUPON_NOT_FOUND':
      return {
        message: 'El código de cupón no existe o fue ingresado incorrectamente.',
        isValid: false,
      };
    case 'INACTIVE':
      return {
        message: 'Este cupón se encuentra inactivo actualmente.',
        isValid: false,
      };
    case 'NOT_STARTED':
      return {
        message: 'Este cupón aún no entra en vigencia.',
        isValid: false,
      };
    case 'EXPIRED':
      return {
        message: 'Este cupón ha expirado.',
        isValid: false,
      };
    case 'MIN_AMOUNT_NOT_MET':
      return {
        message: `El monto mínimo de compra para este cupón es de Q${minAmount.toFixed(2)}. Agrega más productos para canjearlo.`,
        isValid: false,
      };
    case 'MAX_USES_REACHED':
      return {
        message: 'Este cupón ha alcanzado el límite máximo global de canjes permitidos.',
        isValid: false,
      };
    case 'MAX_CLIENT_USES_REACHED':
      return {
        message: 'Has alcanzado el límite de usos permitidos para este cupón con tu cuenta.',
        isValid: false,
      };
    default:
      return {
        message: `Cupón no aplicable (${status}).`,
        isValid: false,
      };
  }
}

export function calculateDiscountPreview(
  type: DiscountType,
  value: number,
  subtotal: number
): number {
  if (subtotal <= 0 || value <= 0) return 0;
  if (type === 'PERCENTAGE') {
    const raw = (subtotal * value) / 100;
    return Math.min(raw, subtotal);
  }
  return Math.min(value, subtotal);
}
