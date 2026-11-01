import { Router } from 'express';
import { OrderController } from '../controllers/order.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';
import { resolveCart } from '../middlewares/cart.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import {
  checkoutSchema,
  advanceOrderStatusSchema,
  processReturnSchema,
  orderQuerySchema,
} from '../dtos/order.dto.js';

const router = Router();
const controller = new OrderController();

// All order operations require authenticated user
router.use(authenticateJwt);

// 1. Checkout (Atomic order creation from cart with stock reservation)
router.post('/checkout', resolveCart, validateBody(checkoutSchema), controller.checkout);

// 2. Order Listing & Detail (Customers view own; Staff views all)
router.get('/', validateQuery(orderQuerySchema), controller.listOrders);
router.get('/:id', controller.getOrderById);

// 3. Order State Machine Progression (Operator / Administrator)
router.patch(
  '/:id/status',
  requireRoles('ADMINISTRATOR', 'OPERATOR'),
  validateBody(advanceOrderStatusSchema),
  controller.advanceStatus
);

// 4. Order Returns (Operator / Administrator)
router.post(
  '/:id/returns',
  requireRoles('ADMINISTRATOR', 'OPERATOR'),
  validateBody(processReturnSchema),
  controller.processReturn
);

export default router;
