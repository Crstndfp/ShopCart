import sql from 'mssql';
import { getDbPool } from '../config/database.js';
import { UserQueryDto } from '../dtos/user.dto.js';

export interface UserRecord {
  IDUser: number;
  IDRole: number;
  RoleCode: string;
  RoleName: string;
  FullName: string;
  Email: string;
  PhoneNumber: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt: string | null;
}

export class UserDal {
  async createUserByAdmin(
    roleCode: string,
    fullName: string,
    email: string,
    passwordHash: string,
    phoneNumber: string | undefined,
    adminUserId: number
  ): Promise<number> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('RoleCode', sql.VarChar(50), roleCode)
      .input('FullName', sql.NVarChar(150), fullName)
      .input('Email', sql.VarChar(150), email)
      .input('PasswordHash', sql.VarChar(255), passwordHash)
      .input('PhoneNumber', sql.VarChar(30), phoneNumber || null)
      .input('AdminUserID', sql.Int, adminUserId)
      .output('NewIDUser', sql.Int)
      .execute('dbo.SP_Users_CreateByAdmin');

    return result.output.NewIDUser as number;
  }

  async listUsers(query: UserQueryDto): Promise<{ items: UserRecord[]; total: number }> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('RoleCode', sql.VarChar(50), query.role || null)
      .input('SearchQuery', sql.NVarChar(150), query.q || null)
      .input('IsActive', sql.Bit, query.isActive ?? null)
      .input('Page', sql.Int, query.page)
      .input('Limit', sql.Int, query.limit)
      .execute('dbo.SP_Users_List');

    const items: UserRecord[] = result.recordset || [];
    const total = items.length > 0 ? (result.recordset[0] as any).TotalCount : 0;

    return { items, total };
  }

  async getUserById(idUser: number): Promise<UserRecord | null> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('IDUser', sql.Int, idUser)
      .execute('dbo.SP_Users_GetByID');

    return result.recordset[0] || null;
  }

  async updateRole(idUser: number, newRoleCode: string, adminUserId: number): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDUser', sql.Int, idUser)
      .input('NewRoleCode', sql.VarChar(50), newRoleCode)
      .input('AdminUserID', sql.Int, adminUserId)
      .execute('dbo.SP_Users_UpdateRole');
  }

  async updateStatus(
    idUser: number,
    isActive: boolean,
    reason: string | undefined,
    adminUserId: number
  ): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDUser', sql.Int, idUser)
      .input('IsActive', sql.Bit, isActive)
      .input('Reason', sql.NVarChar(255), reason || null)
      .input('AdminUserID', sql.Int, adminUserId)
      .execute('dbo.SP_Users_UpdateStatus');
  }
}
