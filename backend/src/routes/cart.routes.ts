import { Router } from 'express';
import { CartController } from '../controllers/cart.controller.js';
import { resolveCart } from '../middlewares/cart.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { addItemToCartSchema, updateCartItemSchema, mergeCartSchema } from '../dtos/cart.dto.js';

const router = Router();
const controller = new CartController();

// All cart operations automatically resolve the cart (via JWT or X-Guest-Token)
router.use(resolveCart);

router.get('/', controller.getCart);
router.post('/items', validateBody(addItemToCartSchema), controller.addItem);
router.patch('/items/:variantId', validateBody(updateCartItemSchema), controller.updateItem);
router.delete('/items/:variantId', controller.removeItem);
router.delete('/', controller.clearCart);

// Merge Guest Cart when client logs in
router.post('/merge', authenticateJwt, validateBody(mergeCartSchema), controller.mergeCart);

export default router;
