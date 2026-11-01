import sql from 'mssql';
import { getDbPool } from '../config/database.js';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto } from '../dtos/coupon.dto.js';

export interface CouponRecord {
  IDCoupon: number;
  Code: string;
  DiscountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
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
  validationStatus: string;
  calculatedDiscount: number;
}

export class CouponDal {
  public async create(dto: CreateCouponDto, userId: number): Promise<number> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Code', sql.VarChar(50), dto.code)
      .input('DiscountType', sql.VarChar(20), dto.discountType)
      .input('DiscountValue', sql.Decimal(12, 2), dto.discountValue)
      .input('MinPurchaseAmount', sql.Decimal(12, 2), dto.minPurchaseAmount)
      .input('StartDate', sql.DateTime2(3), new Date(dto.startDate))
      .input('EndDate', sql.DateTime2(3), new Date(dto.endDate))
      .input('MaxTotalUses', sql.Int, dto.maxTotalUses)
      .input('MaxUsesPerClient', sql.Int, dto.maxUsesPerClient)
      .input('IDCategory', sql.Int, dto.idCategory ?? null)
      .input('UserID', sql.Int, userId)
      .output('NewIDCoupon', sql.Int)
      .execute('dbo.SP_Coupons_Create');

    return result.output.NewIDCoupon as number;
  }

  public async list(query: CouponQueryDto): Promise<{ items: CouponRecord[]; total: number }> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('OnlyActive', sql.Bit, query.onlyActive ?? false)
      .input('PageNumber', sql.Int, query.page ?? 1)
      .input('PageSize', sql.Int, query.limit ?? 20)
      .execute('dbo.SP_Coupons_List');

    const items = (result.recordset as CouponRecord[]) || [];
    const total = items.length > 0 ? ((items[0] as any).TotalRows as number) : 0;
    return { items, total };
  }

  public async getById(idCoupon: number): Promise<CouponRecord | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDCoupon', sql.Int, idCoupon)
      .execute('dbo.SP_Coupons_GetByID');

    return (result.recordset[0] as CouponRecord) || null;
  }

  public async update(idCoupon: number, dto: UpdateCouponDto, userId: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDCoupon', sql.Int, idCoupon)
      .input('DiscountType', sql.VarChar(20), dto.discountType)
      .input('DiscountValue', sql.Decimal(12, 2), dto.discountValue)
      .input('MinPurchaseAmount', sql.Decimal(12, 2), dto.minPurchaseAmount)
      .input('StartDate', sql.DateTime2(3), new Date(dto.startDate))
      .input('EndDate', sql.DateTime2(3), new Date(dto.endDate))
      .input('MaxTotalUses', sql.Int, dto.maxTotalUses)
      .input('MaxUsesPerClient', sql.Int, dto.maxUsesPerClient)
      .input('IDCategory', sql.Int, dto.idCategory ?? null)
      .input('IsActive', sql.Bit, dto.isActive)
      .input('UserID', sql.Int, userId)
      .execute('dbo.SP_Coupons_Update');
  }

  public async deactivate(idCoupon: number, userId: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('IDCoupon', sql.Int, idCoupon)
      .input('UserID', sql.Int, userId)
      .execute('dbo.SP_Coupons_Deactivate');
  }

  public async validateAndPreview(
    code: string,
    idUser: number | null,
    eligibleSubtotal: number
  ): Promise<CouponValidationResult> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('CouponCode', sql.VarChar(50), code)
      .input('IDUser', sql.Int, idUser)
      .input('EligibleSubtotal', sql.Decimal(12, 2), eligibleSubtotal)
      .execute('dbo.SP_Coupons_ValidateAndPreview');

    const row = result.recordset[0];
    return {
      idCoupon: row?.IDCoupon ?? null,
      code: row?.Code ?? code,
      validationStatus: row?.ValidationStatus ?? 'COUPON_NOT_FOUND',
      calculatedDiscount: row?.CalculatedDiscount ?? 0.0,
    };
  }
}
