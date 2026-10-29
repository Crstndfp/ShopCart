import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { registerSchema } from '../dtos/auth.dto.js';
import { validateBody } from '../middlewares/validate.middleware.js';

const router = Router();
const controller = new AuthController();

router.post('/register', validateBody(registerSchema), controller.register);

export default router;