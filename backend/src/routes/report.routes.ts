import { Router } from 'express';
import { ReportController } from '../controllers/report.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.middleware.js';
import { salesSummaryQuerySchema, topProductsQuerySchema } from '../dtos/report.dto.js';

const router = Router();
const controller = new ReportController();

// Protected for Administrators
router.use(authenticateJwt, requireRoles('ADMINISTRATOR'));

router.get('/sales-summary', validateQuery(salesSummaryQuerySchema), controller.getSalesSummary);
router.get('/sales-by-category', controller.getSalesByCategory);
router.get('/top-products', validateQuery(topProductsQuerySchema), controller.getTopSellingProducts);
router.get('/abandoned-carts', controller.getAbandonedCarts);

export default router;
