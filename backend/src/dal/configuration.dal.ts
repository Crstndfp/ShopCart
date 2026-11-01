import sql from 'mssql';
import { getDbPool } from '../config/database.js';

export interface ConfigurationItem {
  IDConfiguration: number;
  ConfigKey: string;
  ConfigValue: string;
  DataType: string;
  Description: string | null;
  IsEditable: boolean;
  UpdatedAt: string | null;
}

export class ConfigurationDal {
  public async getByKey(configKey: string): Promise<ConfigurationItem | null> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('ConfigKey', sql.VarChar(50), configKey)
      .execute('dbo.SP_Configurations_Get');

    return (result.recordset[0] as ConfigurationItem) || null;
  }

  public async updateKey(configKey: string, newValue: string, userId: number): Promise<void> {
    const pool = await getDbPool();
    await pool
      .request()
      .input('ConfigKey', sql.VarChar(50), configKey)
      .input('NewValue', sql.NVarChar(255), newValue)
      .input('IDUser', sql.Int, userId)
      .execute('dbo.SP_Configurations_Update');
  }
}
