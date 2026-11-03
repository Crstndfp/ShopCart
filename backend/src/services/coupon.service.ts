import { CouponDal, CouponRecord, CouponValidationResult } from '../dal/coupon.dal.js';
import { CreateCouponDto, UpdateCouponDto, CouponQueryDto } from '../dtos/coupon.dto.js';
import { NotFoundError, BadRequestError } from '../errors/app-error.js';
import { logger } from '../utils/logger.util.js';

export class CouponService {
  private dal = new CouponDal();

  public async createCoupon(dto: CreateCouponDto, userId: number): Promise<CouponRecord> {
    try {
      const idCoupon = await this.dal.create(dto, userId);
      const created = await this.dal.getById(idCoupon);
      if (!created) {
        throw new NotFoundError(`Coupon with ID ${idCoupon} was created but could not be retrieved.`);
      }
      logger.info(`Coupon created: Code='${created.Code}', Type=${created.DiscountType}, Value=${created.DiscountValue} (ID: ${idCoupon}) by User ${userId}`);
      return created;
    } catch (error: any) {
      if (error.message?.includes('COUPON_CODE_EXISTS')) {
        logger.warn(`Coupon creation rejected: Code '${dto.code}' already exists`);
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
    logger.info(`Coupon updated: ID ${id} by User ${userId}`);
    return updated!;
  }

  public async deactivateCoupon(id: number, userId: number): Promise<void> {
    const existing = await this.dal.getById(id);
    if (!existing) {
      throw new NotFoundError(`Coupon with ID ${id} not found.`);
    }

    await this.dal.deactivate(id, userId);
    logger.info(`Coupon deactivated: ID ${id} by User ${userId}`);
  }

  public async validateCoupon(
    code: string,
    userId: number | null,
    eligibleSubtotal: number
  ): Promise<CouponValidationResult> {
    const result = await this.dal.validateAndPreview(code, userId, eligibleSubtotal);
    if (result.validationStatus === 'VALID') {
      logger.info(`Coupon validated: Code='${code}', Discount=${result.calculatedDiscount}, User=${userId ?? 'Guest'}`);
    } else {
      logger.warn(`Coupon invalid: Code='${code}', Status='${result.validationStatus}', User=${userId ?? 'Guest'}`);
    }
    return result;
  }
}
