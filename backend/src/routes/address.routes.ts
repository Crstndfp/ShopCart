import { Router } from 'express';
import { AddressController } from '../controllers/address.controller.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { createAddressSchema } from '../dtos/address.dto.js';

const router = Router();
const controller = new AddressController();

router.use(authenticateJwt);

router.get('/', controller.listAddresses);
router.post('/', validateBody(createAddressSchema), controller.createAddress);

export default router;
