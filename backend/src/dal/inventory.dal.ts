import sql from 'mssql';
import { getDbPool } from '../config/database.js';
import { AdjustStockDto, KardexQueryDto, StockQueryDto } from '../dtos/inventory.dto.js';

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

export class InventoryDal {
  public async adjustStock(dto: AdjustStockDto, userId: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDVariant', sql.Int, dto.idVariant)
      .input('QuantityChange', sql.Int, dto.quantityChange)
      .input('Reason', sql.NVarChar(255), dto.reason)
      .input('IDUser', sql.Int, userId)
      .execute('dbo.SP_Inventory_AdjustStockManual');
  }

  public async getKardex(query: KardexQueryDto): Promise<{ items: KardexItem[]; total: number }> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDVariant', sql.Int, query.idVariant ?? null)
      .input('MovementType', sql.VarChar(30), query.movementType ?? null)
      .input('StartDate', sql.DateTime2(3), query.startDate ? new Date(query.startDate) : null)
      .input('EndDate', sql.DateTime2(3), query.endDate ? new Date(query.endDate) : null)
      .input('PageNumber', sql.Int, query.page ?? 1)
      .input('PageSize', sql.Int, query.limit ?? 20)
      .execute('dbo.SP_Inventory_GetKardex');

    const items = (result.recordset as KardexItem[]) || [];
    const total = items.length > 0 ? ((items[0] as any).TotalRows as number) : 0;
    return { items, total };
  }

  public async getStockOverview(query: StockQueryDto): Promise<{ items: StockOverviewItem[]; total: number }> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDCategory', sql.Int, query.idCategory ?? null)
      .input('SearchTerm', sql.NVarChar(100), query.search ?? null)
      .input('LowStockOnly', sql.Bit, query.lowStockOnly ?? false)
      .input('PageNumber', sql.Int, query.page ?? 1)
      .input('PageSize', sql.Int, query.limit ?? 20)
      .execute('dbo.SP_Inventory_GetStockOverview');

    const items = (result.recordset as StockOverviewItem[]) || [];
    const total = items.length > 0 ? ((items[0] as any).TotalRows as number) : 0;
    return { items, total };
  }
}
