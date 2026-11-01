import sql from 'mssql';
import { getDbPool } from '../config/database.js';
import { CreateAddressDto } from '../dtos/address.dto.js';

export interface AddressRecord {
  IDAddress: number;
  IDUser: number;
  Alias: string;
  RecipientName: string;
  AddressLine1: string;
  AddressLine2: string | null;
  Municipality: string;
  Department: string;
  PostalCode: string | null;
  ContactPhone: string;
  IsActive: boolean;
}

export class AddressDal {
  public async createAddress(userId: number, dto: CreateAddressDto): Promise<number> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDUser', sql.Int, userId)
      .input('Alias', sql.NVarChar(50), dto.alias)
      .input('RecipientName', sql.NVarChar(150), dto.recipientName)
      .input('AddressLine1', sql.NVarChar(200), dto.addressLine1)
      .input('AddressLine2', sql.NVarChar(200), dto.addressLine2 ?? null)
      .input('Municipality', sql.NVarChar(100), dto.municipality)
      .input('Department', sql.NVarChar(100), dto.department)
      .input('PostalCode', sql.VarChar(20), dto.postalCode ?? null)
      .input('ContactPhone', sql.VarChar(30), dto.contactPhone)
      .output('NewIDAddress', sql.Int)
      .execute('dbo.SP_Addresses_Create');

    return result.output.NewIDAddress as number;
  }

  public async listAddressesByUser(userId: number): Promise<AddressRecord[]> {
    const pool = await getDbPool();
    const result = await pool
      .request()
      .input('IDUser', sql.Int, userId)
      .execute('dbo.SP_Addresses_ListByUser');

    return (result.recordset as AddressRecord[]) || [];
  }
}
