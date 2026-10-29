import sql from 'mssql';
import { getDbPool } from '../config/database.js';
import { SearchProductsQueryDto } from '../dtos/catalog.dto.js';

export class CatalogDal {
  // ==========================================
  // Categories
  // ==========================================
  async createCategory(
    parentCategoryId: number | undefined,
    name: string,
    description: string | undefined,
    userId: number
  ): Promise<number> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('IDParentCategory', sql.Int, parentCategoryId || null)
      .input('Name', sql.NVarChar(100), name)
      .input('Description', sql.NVarChar(255), description || null)
      .input('UserID', sql.Int, userId)
      .output('NewIDCategory', sql.Int)
      .execute('SP_Categories_Create');

    return result.output.NewIDCategory as number;
  }

  async updateCategory(
    idCategory: number,
    parentCategoryId: number | undefined,
    name: string,
    description: string | undefined,
    isActive: boolean,
    userId: number
  ): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDCategory', sql.Int, idCategory)
      .input('IDParentCategory', sql.Int, parentCategoryId || null)
      .input('Name', sql.NVarChar(100), name)
      .input('Description', sql.NVarChar(255), description || null)
      .input('IsActive', sql.Bit, isActive)
      .input('UserID', sql.Int, userId)
      .execute('SP_Categories_Update');
  }

  async listCategories(onlyActive = true): Promise<any[]> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('OnlyActive', sql.Bit, onlyActive)
      .execute('SP_Categories_List');

    return result.recordset;
  }

  // ==========================================
  // Products
  // ==========================================
  async createProduct(
    categoryId: number,
    name: string,
    description: string | undefined,
    mainImageUrl: string | undefined,
    userId: number
  ): Promise<number> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('IDCategory', sql.Int, categoryId)
      .input('Name', sql.NVarChar(150), name)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('MainImageUrl', sql.NVarChar(500), mainImageUrl || null)
      .input('UserID', sql.Int, userId)
      .output('NewIDProduct', sql.Int)
      .execute('SP_Products_Create');

    return result.output.NewIDProduct as number;
  }

  async updateProduct(
    idProduct: number,
    categoryId: number,
    name: string,
    description: string | undefined,
    mainImageUrl: string | undefined,
    isActive: boolean,
    userId: number
  ): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDProduct', sql.Int, idProduct)
      .input('IDCategory', sql.Int, categoryId)
      .input('Name', sql.NVarChar(150), name)
      .input('Description', sql.NVarChar(sql.MAX), description || null)
      .input('MainImageUrl', sql.NVarChar(500), mainImageUrl || null)
      .input('IsActive', sql.Bit, isActive)
      .input('UserID', sql.Int, userId)
      .execute('SP_Products_Update');
  }

  async deactivateProduct(idProduct: number, userId: number): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDProduct', sql.Int, idProduct)
      .input('UserID', sql.Int, userId)
      .execute('SP_Products_Deactivate');
  }

  async getProductByID(idProduct: number): Promise<{ product: any; variants: any[] } | null> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('IDProduct', sql.Int, idProduct)
      .execute('SP_Products_GetByID');

    const recordsets = result.recordsets as sql.IRecordSet<any>[];
    const product = recordsets[0]?.[0];
    if (!product) return null;

    const variants = recordsets[1] || [];
    return { product, variants };
  }

  async searchProducts(query: SearchProductsQueryDto): Promise<{ total: number; data: any[] }> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('SearchText', sql.NVarChar(100), query.search || null)
      .input('IDCategory', sql.Int, query.categoryId || null)
      .input('MinPrice', sql.Decimal(12, 2), query.minPrice || null)
      .input('MaxPrice', sql.Decimal(12, 2), query.maxPrice || null)
      .input('OnlyInStock', sql.Bit, query.onlyInStock || 0)
      .input('SortBy', sql.VarChar(30), query.sortBy)
      .input('SortDir', sql.VarChar(4), query.sortDir)
      .input('PageNumber', sql.Int, query.page)
      .input('PageSize', sql.Int, query.limit)
      .execute('SP_Catalog_SearchProducts');

    const total = result.recordset[0]?.TotalRows || 0;
    return {
      total,
      data: result.recordset,
    };
  }

  // ==========================================
  // Variants
  // ==========================================
  async createVariant(
    idProduct: number,
    sku: string,
    attributesJson: string,
    price: number,
    initialStock: number,
    userId: number
  ): Promise<number> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('IDProduct', sql.Int, idProduct)
      .input('SKU', sql.VarChar(50), sku)
      .input('AttributesJson', sql.NVarChar(500), attributesJson)
      .input('Price', sql.Decimal(12, 2), price)
      .input('InitialStock', sql.Int, initialStock)
      .input('UserID', sql.Int, userId)
      .output('NewIDVariant', sql.Int)
      .execute('SP_Variants_Create');

    return result.output.NewIDVariant as number;
  }

  async updateVariant(
    idVariant: number,
    attributesJson: string,
    price: number,
    isActive: boolean,
    userId: number
  ): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDVariant', sql.Int, idVariant)
      .input('AttributesJson', sql.NVarChar(500), attributesJson)
      .input('Price', sql.Decimal(12, 2), price)
      .input('IsActive', sql.Bit, isActive)
      .input('UserID', sql.Int, userId)
      .execute('SP_Variants_Update');
  }
}
