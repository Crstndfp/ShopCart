import { Router } from 'express';
import { CatalogController } from '../controllers/catalog.controller.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  updateVariantSchema,
  searchProductsQuerySchema,
} from '../dtos/catalog.dto.js';

const router = Router();
const controller = new CatalogController();

// ==========================================
// Public Endpoints (Browsing & Searching)
// ==========================================
router.get('/categories', controller.listCategories);
router.get('/products', validateQuery(searchProductsQuerySchema), controller.searchProducts);
router.get('/products/:id', controller.getProductByID);

// ==========================================
// Admin-Protected Endpoints (Catalog Management)
// ==========================================
const adminGuard = [authenticateJwt, requireRoles('ADMINISTRATOR')];

// Category Management
router.post('/categories', adminGuard, validateBody(createCategorySchema), controller.createCategory);
router.put('/categories/:id', adminGuard, validateBody(updateCategorySchema), controller.updateCategory);

// Product Management
router.post('/products', adminGuard, validateBody(createProductSchema), controller.createProduct);
router.put('/products/:id', adminGuard, validateBody(updateProductSchema), controller.updateProduct);
router.delete('/products/:id', adminGuard, controller.deactivateProduct);

// Variant Management
router.post('/products/:id/variants', adminGuard, validateBody(createVariantSchema), controller.createVariant);
router.put('/variants/:id', adminGuard, validateBody(updateVariantSchema), controller.updateVariant);

export default router;
