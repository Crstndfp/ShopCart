import { InventoryDal, KardexItem, StockOverviewItem } from '../dal/inventory.dal.js';
import { AdjustStockDto, KardexQueryDto, StockQueryDto } from '../dtos/inventory.dto.js';
import { NotFoundError, BadRequestError } from '../errors/app-error.js';
import { logger } from '../utils/logger.util.js';

export class InventoryService {
  private dal = new InventoryDal();

  public async adjustStock(dto: AdjustStockDto, userId: number): Promise<void> {
    try {
      await this.dal.adjustStock(dto, userId);
      logger.info(
        `Manual stock adjustment registered for variant ID ${dto.idVariant}: ${dto.quantityChange > 0 ? '+' : ''}${dto.quantityChange} units by User ${userId}`,
        { reason: dto.reason }
      );
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('VARIANT_NOT_FOUND')) {
        throw new NotFoundError(`Product variant with ID ${dto.idVariant} not found.`);
      }
      if (msg.includes('NEGATIVE_STOCK_ERROR') || msg.includes('MANDATORY_REASON') || msg.includes('INVALID_QUANTITY')) {
        throw new BadRequestError(msg.replace(/^.*?:\s*/, ''));
      }
      throw error;
    }
  }

  public async getKardex(query: KardexQueryDto): Promise<{ items: KardexItem[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.dal.getKardex(query);
    return {
      items,
      total,
      page,
      limit,
    };
  }

  public async getStockOverview(query: StockQueryDto): Promise<{ items: StockOverviewItem[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { items, total } = await this.dal.getStockOverview(query);
    return {
      items,
      total,
      page,
      limit,
    };
  }
}
