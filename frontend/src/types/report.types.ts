export interface SalesSummaryItem {
  SalesDate: string;
  SalesYear: number;
  SalesWeek: number;
  SalesMonth: number;
  TotalOrdersCount: number;
  GrossSalesAmount: number;
  TotalRefundedAmount: number;
  NetSalesAmount: number;
  AverageOrderTicket: number;
}

export interface SalesByCategoryItem {
  IDCategory: number;
  CategoryName: string;
  OrdersCount: number;
  NetUnitsSold: number;
  GrossCategorySales: number;
  CategoryRefundedAmount: number;
  NetCategorySales: number;
}

export interface TopSellingProductItem {
  IDProduct: number;
  ProductName: string;
  CategoryName: string;
  IDVariant: number;
  SKU: string;
  NetUnitsSold: number;
  NetProductSales: number;
}

export interface AbandonedCartItem {
  IDCart: number;
  IDUser: number | null;
  CustomerName: string | null;
  CustomerEmail: string | null;
  GuestToken: string | null;
  CreatedAt: string;
  LastActivityAt: string;
  InactiveHours: number;
  TotalItemsCount: number;
  EstimatedCartTotal: number;
}

export interface SalesSummaryFilters {
  startDate?: string;
  endDate?: string;
}

export interface TopProductsFilters {
  limit?: number;
}

export interface AggregatedSalesKPIs {
  totalNetSales: number;
  totalGrossSales: number;
  totalRefunded: number;
  totalOrders: number;
  averageTicket: number;
  daysWithSales: number;
}

export function calculateSalesKPIs(items: SalesSummaryItem[]): AggregatedSalesKPIs {
  if (!items || items.length === 0) {
    return {
      totalNetSales: 0,
      totalGrossSales: 0,
      totalRefunded: 0,
      totalOrders: 0,
      averageTicket: 0,
      daysWithSales: 0,
    };
  }

  const totals = items.reduce(
    (acc, curr) => {
      acc.totalNetSales += Number(curr.NetSalesAmount) || 0;
      acc.totalGrossSales += Number(curr.GrossSalesAmount) || 0;
      acc.totalRefunded += Number(curr.TotalRefundedAmount) || 0;
      acc.totalOrders += Number(curr.TotalOrdersCount) || 0;
      return acc;
    },
    { totalNetSales: 0, totalGrossSales: 0, totalRefunded: 0, totalOrders: 0 }
  );

  const averageTicket =
    totals.totalOrders > 0
      ? Math.round((totals.totalNetSales / totals.totalOrders) * 100) / 100
      : 0;

  return {
    ...totals,
    averageTicket,
    daysWithSales: items.length,
  };
}

export interface CategoryShareItem extends SalesByCategoryItem {
  percentageOfTotal: number;
}

export function calculateCategoryShare(items: SalesByCategoryItem[]): CategoryShareItem[] {
  if (!items || items.length === 0) return [];

  const grandNetSales = items.reduce(
    (sum, c) => sum + (Number(c.NetCategorySales) || 0),
    0
  );

  return items.map((cat) => {
    const net = Number(cat.NetCategorySales) || 0;
    const percentageOfTotal =
      grandNetSales > 0 ? Math.round((net / grandNetSales) * 1000) / 10 : 0;
    return {
      ...cat,
      percentageOfTotal,
    };
  });
}

export function getDateRangeFromPreset(
  preset: 'today' | '7d' | '30d' | '90d' | 'all'
): { startDate?: string; endDate?: string } {
  const now = new Date();
  const formatISO = (d: Date) => d.toISOString().split('T')[0];

  const end = formatISO(now);

  switch (preset) {
    case 'today':
      return { startDate: end, endDate: end };
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return { startDate: formatISO(start), endDate: end };
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return { startDate: formatISO(start), endDate: end };
    }
    case '90d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 90);
      return { startDate: formatISO(start), endDate: end };
    }
    case 'all':
    default:
      return {};
  }
}
