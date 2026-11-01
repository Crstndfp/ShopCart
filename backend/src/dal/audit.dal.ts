import sql from 'mssql';
import { getDbPool } from '../config/database.js';
import { AuditQueryDto } from '../dtos/audit.dto.js';

export interface AuditLogItem {
  IDAuditLog: number;
  IDUser: number | null;
  UserName: string | null;
  UserEmail: string | null;
  Module: string;
  EntityName: string;
  EntityID: string;
  ActionType: string;
  PreviousValueJson: string | null;
  NewValueJson: string | null;
  LoggedAt: string;
}

export class AuditDal {
  public async listLogs(query: AuditQueryDto): Promise<{ items: AuditLogItem[]; total: number }> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('Module', sql.VarChar(50), query.module ?? null)
      .input('EntityName', sql.VarChar(50), query.entityName ?? null)
      .input('StartDate', sql.DateTime2(3), query.startDate ? new Date(query.startDate) : null)
      .input('EndDate', sql.DateTime2(3), query.endDate ? new Date(query.endDate) : null)
      .input('PageNumber', sql.Int, query.page ?? 1)
      .input('PageSize', sql.Int, query.limit ?? 50)
      .execute('dbo.SP_Audit_ListLogs');

    const items = (result.recordset as AuditLogItem[]) || [];
    const total = items.length > 0 ? ((items[0] as any).TotalRows as number) : 0;

    return { items, total };
  }
}
