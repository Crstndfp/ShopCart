import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import { adjustStockSchema, kardexQuerySchema, stockQuerySchema } from '../dtos/inventory.dto.js';

const router = Router();
const controller = new InventoryController();

// Protected for Administrator and Inventory Manager
router.use(authenticateJwt, requireRoles('ADMINISTRATOR', 'INVENTORY_MANAGER'));

router.post('/adjustments', validateBody(adjustStockSchema), controller.adjustStock);
router.get('/kardex', validateQuery(kardexQuerySchema), controller.getKardex);
router.get('/stock', validateQuery(stockQuerySchema), controller.getStockOverview);

export default router;
