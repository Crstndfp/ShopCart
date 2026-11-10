import { describe, expect, it } from 'vitest';
import {
  calculateCategoryShare,
  calculateSalesKPIs,
  getDateRangeFromPreset,
  type SalesByCategoryItem,
  type SalesSummaryItem,
} from '../types/report.types.js';

describe('RF-08 Executive Dashboard & Business Reports Domain Logic', () => {
  describe('calculateSalesKPIs', () => {
    it('should return zeroes when sales summary list is empty', () => {
      const kpis = calculateSalesKPIs([]);
      expect(kpis.totalNetSales).toBe(0);
      expect(kpis.totalGrossSales).toBe(0);
      expect(kpis.totalRefunded).toBe(0);
      expect(kpis.totalOrders).toBe(0);
      expect(kpis.averageTicket).toBe(0);
      expect(kpis.daysWithSales).toBe(0);
    });

    it('should correctly aggregate multiple daily sales records', () => {
      const items: SalesSummaryItem[] = [
        {
          SalesDate: '2026-11-01',
          SalesYear: 2026,
          SalesWeek: 44,
          SalesMonth: 11,
          TotalOrdersCount: 2,
          GrossSalesAmount: 5000,
          TotalRefundedAmount: 500,
          NetSalesAmount: 4500,
          AverageOrderTicket: 2250,
        },
        {
          SalesDate: '2026-11-02',
          SalesYear: 2026,
          SalesWeek: 44,
          SalesMonth: 11,
          TotalOrdersCount: 3,
          GrossSalesAmount: 7000,
          TotalRefundedAmount: 0,
          NetSalesAmount: 7000,
          AverageOrderTicket: 2333.33,
        },
      ];

      const kpis = calculateSalesKPIs(items);
      expect(kpis.totalGrossSales).toBe(12000);
      expect(kpis.totalRefunded).toBe(500);
      expect(kpis.totalNetSales).toBe(11500);
      expect(kpis.totalOrders).toBe(5);
      expect(kpis.averageTicket).toBe(2300); // 11500 / 5 = 2300
      expect(kpis.daysWithSales).toBe(2);
    });

    it('should handle divide-by-zero safely if totalOrders is 0', () => {
      const items: SalesSummaryItem[] = [
        {
          SalesDate: '2026-11-01',
          SalesYear: 2026,
          SalesWeek: 44,
          SalesMonth: 11,
          TotalOrdersCount: 0,
          GrossSalesAmount: 0,
          TotalRefundedAmount: 0,
          NetSalesAmount: 0,
          AverageOrderTicket: 0,
        },
      ];

      const kpis = calculateSalesKPIs(items);
      expect(kpis.averageTicket).toBe(0);
    });
  });

  describe('calculateCategoryShare', () => {
    it('should return empty array when category list is empty', () => {
      expect(calculateCategoryShare([])).toEqual([]);
    });

    it('should calculate relative percentage share of total net sales per category', () => {
      const categories: SalesByCategoryItem[] = [
        {
          IDCategory: 1,
          CategoryName: 'Tecnología',
          OrdersCount: 4,
          NetUnitsSold: 5,
          GrossCategorySales: 8000,
          CategoryRefundedAmount: 0,
          NetCategorySales: 8000,
        },
        {
          IDCategory: 2,
          CategoryName: 'Ropa y Calzado',
          OrdersCount: 2,
          NetUnitsSold: 3,
          GrossCategorySales: 2000,
          CategoryRefundedAmount: 0,
          NetCategorySales: 2000,
        },
      ];

      const shared = calculateCategoryShare(categories);
      expect(shared).toHaveLength(2);
      expect(shared[0].percentageOfTotal).toBe(80); // 8000 / 10000 = 80%
      expect(shared[1].percentageOfTotal).toBe(20); // 2000 / 10000 = 20%
    });

    it('should handle zero grand net sales gracefully without NaN', () => {
      const categories: SalesByCategoryItem[] = [
        {
          IDCategory: 1,
          CategoryName: 'Varios',
          OrdersCount: 0,
          NetUnitsSold: 0,
          GrossCategorySales: 0,
          CategoryRefundedAmount: 0,
          NetCategorySales: 0,
        },
      ];

      const shared = calculateCategoryShare(categories);
      expect(shared[0].percentageOfTotal).toBe(0);
    });
  });

  describe('getDateRangeFromPreset', () => {
    it('should return empty object for "all" preset', () => {
      expect(getDateRangeFromPreset('all')).toEqual({});
    });

    it('should generate ISO date strings YYYY-MM-DD for "7d" preset', () => {
      const range = getDateRangeFromPreset('7d');
      expect(range.startDate).toBeDefined();
      expect(range.endDate).toBeDefined();
      expect(range.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(range.startDate!).getTime()).toBeLessThanOrEqual(
        new Date(range.endDate!).getTime()
      );
    });

    it('should generate identical start and end for "today"', () => {
      const range = getDateRangeFromPreset('today');
      expect(range.startDate).toBe(range.endDate);
    });
  });
});
