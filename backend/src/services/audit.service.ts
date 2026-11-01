import { AuditDal } from '../dal/audit.dal.js';
import { AuditQueryDto } from '../dtos/audit.dto.js';

export class AuditService {
  private dal = new AuditDal();

  public async listLogs(query: AuditQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const { items, total } = await this.dal.listLogs(query);
    return {
      items,
      total,
      page,
      limit,
    };
  }
}
