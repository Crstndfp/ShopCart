import { ReportDal } from '../dal/report.dal.js';
import { SalesSummaryQueryDto, TopProductsQueryDto } from '../dtos/report.dto.js';

export class ReportService {
  private dal = new ReportDal();

  public async getSalesSummary(query: SalesSummaryQueryDto) {
    return await this.dal.getSalesSummary(query.startDate, query.endDate);
  }

  public async getSalesByCategory() {
    return await this.dal.getSalesByCategory();
  }

  public async getTopSellingProducts(query: TopProductsQueryDto) {
    return await this.dal.getTopSellingProducts(query.limit ?? 10);
  }

  public async getAbandonedCarts() {
    return await this.dal.getAbandonedCarts();
  }
}
