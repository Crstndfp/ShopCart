import { Router } from 'express';
import { ConfigurationController } from '../controllers/configuration.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { updateConfigurationSchema } from '../dtos/configuration.dto.js';

const router = Router();
const controller = new ConfigurationController();

router.use(authenticateJwt, requireRoles('ADMINISTRATOR'));

router.get('/:key', controller.getConfiguration);
router.put('/:key', validateBody(updateConfigurationSchema), controller.updateConfiguration);

export default router;
