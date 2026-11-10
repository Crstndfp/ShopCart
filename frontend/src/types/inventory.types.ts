export interface StockOverviewItem {
  IDVariant: number;
  IDProduct: number;
  ProductName: string;
  CategoryName: string;
  SKU: string;
  Price: number;
  PhysicalStock: number;
  ReservedStock: number;
  AvailableStock: number;
  IsActive: boolean;
}

export type KardexMovementType =
  | 'INITIAL_CHARGE'
  | 'PURCHASE_ENTRY'
  | 'SALE_EXIT'
  | 'CLIENT_RETURN'
  | 'POSITIVE_ADJUSTMENT'
  | 'NEGATIVE_ADJUSTMENT';

export interface KardexItem {
  IDKardex: number;
  IDVariant: number;
  SKU: string;
  ProductName: string;
  AttributesJson: string;
  MovementType: string;
  Quantity: number;
  PreviousBalance: number;
  NewBalance: number;
  Reason: string;
  IDUser: number;
  OperatorName: string;
  IDOrder: number | null;
  MovementDate: string;
}

export interface AdjustStockPayload {
  idVariant: number;
  quantityChange: number;
  reason: string;
}

export interface StockFilters {
  search?: string;
  idCategory?: number;
  lowStockOnly?: boolean;
  page?: number;
  limit?: number;
}

export interface KardexFilters {
  idVariant?: number;
  movementType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface StockOverviewResponse {
  statusCode: number;
  items: StockOverviewItem[];
  total: number;
  page: number;
  limit: number;
}

export interface KardexResponse {
  statusCode: number;
  items: KardexItem[];
  total: number;
  page: number;
  limit: number;
}

export interface KardexMovementMeta {
  label: string;
  badgeClass: string;
  isPositive: boolean;
  prefix: string;
}

export const KARDEX_MOVEMENT_META: Record<string, KardexMovementMeta> = {
  INITIAL_CHARGE: {
    label: 'Carga Inicial',
    badgeClass: 'border-brand-400/40 bg-brand-950/80 text-brand-300',
    isPositive: true,
    prefix: '+',
  },
  PURCHASE_ENTRY: {
    label: 'Entrada por Compra',
    badgeClass: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300',
    isPositive: true,
    prefix: '+',
  },
  POSITIVE_ADJUSTMENT: {
    label: 'Ajuste Físico (+)',
    badgeClass: 'border-teal-500/40 bg-teal-950/80 text-teal-300',
    isPositive: true,
    prefix: '+',
  },
  SALE_EXIT: {
    label: 'Salida por Venta',
    badgeClass: 'border-crimson-600/40 bg-crimson-950/80 text-red-300',
    isPositive: false,
    prefix: '-',
  },
  NEGATIVE_ADJUSTMENT: {
    label: 'Merma / Ajuste (-)',
    badgeClass: 'border-amber-500/40 bg-amber-950/80 text-amber-300',
    isPositive: false,
    prefix: '-',
  },
  CLIENT_RETURN: {
    label: 'Devolución de Cliente',
    badgeClass: 'border-sky-500/40 bg-sky-950/80 text-sky-300',
    isPositive: true,
    prefix: '+',
  },
};

export function getKardexMeta(type: string): KardexMovementMeta {
  return (
    KARDEX_MOVEMENT_META[type] || {
      label: type,
      badgeClass: 'border-slate-500/40 bg-slate-900/80 text-slate-300',
      isPositive: false,
      prefix: '',
    }
  );
}

export function calculateProjectedStock(physicalStock: number, quantityChange: number): number {
  return physicalStock + quantityChange;
}

export function formatStockStatus(availableStock: number): {
  label: string;
  colorClass: string;
  isLow: boolean;
} {
  if (availableStock <= 0) {
    return {
      label: 'Agotado',
      colorClass: 'border-crimson-600/40 bg-crimson-950/80 text-red-300',
      isLow: true,
    };
  }
  if (availableStock <= 5) {
    return {
      label: 'Stock Crítico',
      colorClass: 'border-crimson-600/40 bg-crimson-950/80 text-red-300',
      isLow: true,
    };
  }
  return {
    label: 'Saludable',
    colorClass: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-300',
    isLow: false,
  };
}
