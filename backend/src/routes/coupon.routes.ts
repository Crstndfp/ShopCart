import { Router } from 'express';
import { CouponController } from '../controllers/coupon.controller.js';
import { authenticateJwt, requireRoles, optionalAuthenticateJwt } from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  couponQuerySchema,
} from '../dtos/coupon.dto.js';

const router = Router();
const controller = new CouponController();

// 1. Client/Checkout route: Validate and preview coupon discount
router.post(
  '/validate',
  optionalAuthenticateJwt,
  validateBody(validateCouponSchema),
  controller.validateCoupon
);

// 2. Admin routes: Management of coupons
router.use(authenticateJwt, requireRoles('ADMINISTRATOR'));

router.get('/', validateQuery(couponQuerySchema), controller.listCoupons);
router.post('/', validateBody(createCouponSchema), controller.createCoupon);
router.get('/:id', controller.getCouponById);
router.put('/:id', validateBody(updateCouponSchema), controller.updateCoupon);
router.delete('/:id', controller.deactivateCoupon);

export default router;
