import { Router } from 'express';
import { AuditController } from '../controllers/audit.controller.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.middleware.js';
import { validateQuery } from '../middlewares/validate.middleware.js';
import { auditQuerySchema } from '../dtos/audit.dto.js';

const router = Router();
const controller = new AuditController();

router.use(authenticateJwt, requireRoles('ADMINISTRATOR'));

router.get('/logs', validateQuery(auditQuerySchema), controller.listLogs);

export default router;
