import sql from 'mssql';
import { getDbPool } from '../config/database.js';

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

export class ReportDal {
  public async getSalesSummary(startDate?: string, endDate?: string): Promise<SalesSummaryItem[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('StartDate', sql.Date, startDate ? new Date(startDate) : null)
      .input('EndDate', sql.Date, endDate ? new Date(endDate) : null)
      .execute('dbo.SP_Reports_GetSalesSummary');

    return (result.recordset as SalesSummaryItem[]) || [];
  }

  public async getSalesByCategory(): Promise<SalesByCategoryItem[]> {
    const pool = await getDbPool();
    const result = await pool.request().execute('dbo.SP_Reports_GetSalesByCategory');
    return (result.recordset as SalesByCategoryItem[]) || [];
  }

  public async getTopSellingProducts(limit: number = 10): Promise<TopSellingProductItem[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('TopN', sql.Int, limit)
      .execute('dbo.SP_Reports_GetTopSellingProducts');

    return (result.recordset as TopSellingProductItem[]) || [];
  }

  public async getAbandonedCarts(): Promise<AbandonedCartItem[]> {
    const pool = await getDbPool();
    const result = await pool.request().execute('dbo.SP_Reports_GetAbandonedCarts');
    return (result.recordset as AbandonedCartItem[]) || [];
  }
}
