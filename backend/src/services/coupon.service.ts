import { CouponDal, CouponRecord, CouponValidationResult } from '../dal/coupon.dal.js';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto } from '../dtos/coupon.dto.js';
import { NotFoundError, BadRequestError } from '../errors/app-error.js';

export class CouponService {
  private dal = new CouponDal();

  public async createCoupon(dto: CreateCouponDto, userId: number): Promise<CouponRecord> {
    try {
      const idCoupon = await this.dal.create(dto, userId);
      const created = await this.dal.getById(idCoupon);
      if (!created) {
        throw new NotFoundError(`Coupon with ID ${idCoupon} was created but could not be retrieved.`);
      }
      return created;
    } catch (error: any) {
      if (error.message?.includes('COUPON_CODE_EXISTS')) {
        throw new BadRequestError('Coupon code already exists.');
      }
      throw error;
    }
  }

  public async listCoupons(query: CouponQueryDto): Promise<{ items: CouponRecord[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.dal.list(query);
    return {
      items,
      total,
      page,
      limit,
    };
  }

  public async getCouponById(id: number): Promise<CouponRecord> {
    const coupon = await this.dal.getById(id);
    if (!coupon) {
      throw new NotFoundError(`Coupon with ID ${id} not found.`);
    }
    return coupon;
  }

  public async updateCoupon(id: number, dto: UpdateCouponDto, userId: number): Promise<CouponRecord> {
    const existing = await this.dal.getById(id);
    if (!existing) {
      throw new NotFoundError(`Coupon with ID ${id} not found.`);
    }

    await this.dal.update(id, dto, userId);
    const updated = await this.dal.getById(id);
    return updated!;
  }

  public async deactivateCoupon(id: number, userId: number): Promise<void> {
    const existing = await this.dal.getById(id);
    if (!existing) {
      throw new NotFoundError(`Coupon with ID ${id} not found.`);
    }

    await this.dal.deactivate(id, userId);
  }

  public async validateCoupon(
    code: string,
    userId: number | null,
    eligibleSubtotal: number
  ): Promise<CouponValidationResult> {
    return await this.dal.validateAndPreview(code, userId, eligibleSubtotal);
  }
}
