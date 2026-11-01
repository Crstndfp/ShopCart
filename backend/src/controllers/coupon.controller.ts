import { Request, Response, NextFunction } from 'express';
import { CouponService } from '../services/coupon.service.js';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponQueryDto,
} from '../dtos/coupon.dto.js';

export class CouponController {
  private service = new CouponService();

  createCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateCouponDto;
      const userId = req.user!.idUser;
      const result = await this.service.createCoupon(dto, userId);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  listCoupons = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as CouponQueryDto;
      const result = await this.service.listCoupons(query);
      res.status(200).json({ statusCode: 200, ...result });
    } catch (error) {
      next(error);
    }
  };

  getCouponById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const coupon = await this.service.getCouponById(id);
      res.status(200).json({ statusCode: 200, data: coupon });
    } catch (error) {
      next(error);
    }
  };

  updateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const dto = req.body as UpdateCouponDto;
      const userId = req.user!.idUser;
      const result = await this.service.updateCoupon(id, dto, userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  deactivateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = parseInt(req.params.id as string, 10);
      const userId = req.user!.idUser;
      await this.service.deactivateCoupon(id, userId);
      res.status(200).json({
        statusCode: 200,
        message: `Coupon ${id} deactivated successfully.`,
      });
    } catch (error) {
      next(error);
    }
  };

  validateCoupon = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as ValidateCouponDto;
      const userId = req.user?.idUser ?? null;
      const result = await this.service.validateCoupon(dto.code, userId, dto.eligibleSubtotal);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };
}
