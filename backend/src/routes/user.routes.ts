import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';
import { validateBody, validateQuery } from '../middlewares/validate.middleware.js';
import {
  createUserAdminSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
  userQuerySchema,
} from '../dtos/user.dto.js';

const router = Router();
const controller = new UserController();

// All user management routes strictly require Administrator privileges
router.use(authenticateJwt, requireRoles('ADMINISTRATOR'));

router.post('/', validateBody(createUserAdminSchema), controller.createUser);
router.get('/', validateQuery(userQuerySchema), controller.listUsers);
router.get('/:id', controller.getUserById);
router.patch('/:id/role', validateBody(updateUserRoleSchema), controller.updateRole);
router.patch('/:id/status', validateBody(updateUserStatusSchema), controller.updateStatus);

export default router;
