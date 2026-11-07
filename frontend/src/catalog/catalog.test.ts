import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalogApi } from '../api/catalog.api.js';
import {
  buildCatalogSearchQuery,
  formatGTQ,
  formatPriceRangeGTQ,
  parseVariantAttributes,
} from '../types/catalog.types.js';

describe('RF-02 Catalog, Variants & Real-Time Stock Module', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('Monetary Formatting in Quetzales (GTQ)', () => {
    it('formats single amounts and price ranges accurately', () => {
      const formatted = formatGTQ(1250.5);
      expect(formatted).toContain('1,250.50');

      const singleRange = formatPriceRangeGTQ(499.99, 499.99);
      expect(singleRange).toBe(formatGTQ(499.99));

      const multiRange = formatPriceRangeGTQ(100, 250);
      expect(multiRange).toBe(`${formatGTQ(100)} – ${formatGTQ(250)}`);
    });
  });

  describe('Search Query Builder (buildCatalogSearchQuery)', () => {
    it('serializes active search filters and omits empty parameters', () => {
      const qs = buildCatalogSearchQuery({
        search: '  Monitor 4K  ',
        categoryId: 2,
        minPrice: 500,
        maxPrice: 3500,
        onlyInStock: true,
        sortBy: 'PRICE',
        sortDir: 'ASC',
        page: 2,
        limit: 12,
      });

      expect(qs).toBe(
        '?search=Monitor+4K&categoryId=2&minPrice=500&maxPrice=3500&onlyInStock=true&sortBy=PRICE&sortDir=ASC&page=2&limit=12'
      );

      expect(buildCatalogSearchQuery({})).toBe('');
    });
  });

  describe('Variant Dynamic Attributes Parser (parseVariantAttributes)', () => {
    it('returns pre-parsed Attributes object or parses JSON string safely', () => {
      const fromObject = parseVariantAttributes({
        AttributesJson: '{}',
        Attributes: { Color: 'Negro', Capacidad: '512GB' },
      });
      expect(fromObject).toEqual({ Color: 'Negro', Capacidad: '512GB' });

      const fromJson = parseVariantAttributes({
        AttributesJson: '{"Talla":"L","Material":"Algodón"}',
      });
      expect(fromJson).toEqual({ Talla: 'L', Material: 'Algodón' });

      const malformed = parseVariantAttributes({
        AttributesJson: 'not-valid-json',
      });
      expect(malformed).toEqual({});
    });
  });

  describe('Catalog API Service Integration', () => {
    it('fetches paginated products and product detail with variants', async () => {
      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith('/api/v1/catalog/products?')) {
          return new Response(
            JSON.stringify({
              statusCode: 200,
              pagination: { page: 1, limit: 12, total: 1, totalPages: 1 },
              data: [
                {
                  IDProduct: 10,
                  ProductName: 'Laptop Pro 16',
                  Description: 'Workstation profesional',
                  MainImageUrl: null,
                  IDCategory: 1,
                  CategoryName: 'Tecnología',
                  MinPrice: 9500,
                  MaxPrice: 12000,
                  TotalPhysicalStock: 8,
                  TotalAvailableStock: 6,
                  CreatedAt: '2026-11-05T00:00:00Z',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (url === '/api/v1/catalog/products/10') {
          return new Response(
            JSON.stringify({
              statusCode: 200,
              data: {
                IDProduct: 10,
                IDCategory: 1,
                CategoryName: 'Tecnología',
                ProductName: 'Laptop Pro 16',
                Description: 'Workstation profesional',
                MainImageUrl: null,
                IsActive: true,
                CreatedAt: '2026-11-05T00:00:00Z',
                UpdatedAt: null,
                Variants: [
                  {
                    IDVariant: 101,
                    IDProduct: 10,
                    SKU: 'LAP-PRO-16-512',
                    AttributesJson: '{"RAM":"16GB","SSD":"512GB"}',
                    Attributes: { RAM: '16GB', SSD: '512GB' },
                    Price: 9500,
                    PhysicalStock: 5,
                    ReservedQuantity: 2,
                    AvailableStock: 3,
                    IsActive: true,
                    CreatedAt: '2026-11-05T00:00:00Z',
                  },
                ],
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response('{}', { status: 404 });
      });

      vi.stubGlobal('fetch', fetchMock);

      const searchRes = await catalogApi.searchProducts({ search: 'Laptop', onlyInStock: true });
      expect(searchRes.data).toHaveLength(1);
      expect(searchRes.data[0]?.TotalAvailableStock).toBe(6);

      const detailRes = await catalogApi.getProductById(10);
      expect(detailRes.Variants).toHaveLength(1);
      expect(detailRes.Variants[0]?.SKU).toBe('LAP-PRO-16-512');
      expect(detailRes.Variants[0]?.AvailableStock).toBe(3);
    });
  });
});
