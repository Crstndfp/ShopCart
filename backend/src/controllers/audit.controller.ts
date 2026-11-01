import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service.js';
import { AuditQueryDto } from '../dtos/audit.dto.js';

export class AuditController {
  private service = new AuditService();

  listLogs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as AuditQueryDto;
      const result = await this.service.listLogs(query);
      res.status(200).json({ statusCode: 200, ...result });
    } catch (error) {
      next(error);
    }
  };
}
