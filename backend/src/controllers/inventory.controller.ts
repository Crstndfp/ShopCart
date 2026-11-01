import { Request, Response, NextFunction } from 'express';
import { InventoryService } from '../services/inventory.service.js';
import { AdjustStockDto, KardexQueryDto, StockQueryDto } from '../dtos/inventory.dto.js';

export class InventoryController {
  private service = new InventoryService();

  adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as AdjustStockDto;
      const userId = req.user!.idUser;
      await this.service.adjustStock(dto, userId);
      res.status(200).json({
        statusCode: 200,
        message: 'Manual stock adjustment registered and audited successfully in Kardex.',
      });
    } catch (error) {
      next(error);
    }
  };

  getKardex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as KardexQueryDto;
      const result = await this.service.getKardex(query);
      res.status(200).json({ statusCode: 200, ...result });
    } catch (error) {
      next(error);
    }
  };

  getStockOverview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as StockQueryDto;
      const result = await this.service.getStockOverview(query);
      res.status(200).json({ statusCode: 200, ...result });
    } catch (error) {
      next(error);
    }
  };
}
