import { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service.js';
import { SalesSummaryQueryDto, TopProductsQueryDto } from '../dtos/report.dto.js';

export class ReportController {
  private service = new ReportService();

  getSalesSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as SalesSummaryQueryDto;
      const data = await this.service.getSalesSummary(query);
      res.status(200).json({ statusCode: 200, data });
    } catch (error) {
      next(error);
    }
  };

  getSalesByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getSalesByCategory();
      res.status(200).json({ statusCode: 200, data });
    } catch (error) {
      next(error);
    }
  };

  getTopSellingProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as TopProductsQueryDto;
      const data = await this.service.getTopSellingProducts(query);
      res.status(200).json({ statusCode: 200, data });
    } catch (error) {
      next(error);
    }
  };

  getAbandonedCarts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data = await this.service.getAbandonedCarts();
      res.status(200).json({ statusCode: 200, data });
    } catch (error) {
      next(error);
    }
  };
}
