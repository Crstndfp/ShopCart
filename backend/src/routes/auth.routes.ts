import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { registerSchema, loginSchema, refreshTokenSchema } from '../dtos/auth.dto.js';
import { validateBody } from '../middlewares/validate.middleware.js';
import { authenticateJwt } from '../middlewares/auth.middleware.js';

const router = Router();
const controller = new AuthController();

// Public Authentication Endpoints
router.post('/register', validateBody(registerSchema), controller.register);
router.post('/login', validateBody(loginSchema), controller.login);
router.post('/refresh', validateBody(refreshTokenSchema), controller.refreshToken);
router.post('/logout', validateBody(refreshTokenSchema), controller.logout);

// Protected Authentication Endpoints
router.get('/me', authenticateJwt, controller.getMe);

export default router;
