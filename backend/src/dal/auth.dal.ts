import sql from 'mssql';
import { getDbPool } from '../config/database.js';

export class AuthDal {
    async registerUser(
        roleCode: string,
        fullName: string,
        email: string,
        passwordHash: string,
        phoneNumber?: string
    ): Promise<number> {
        const pool = await getDbPool();

        const result = await pool
            .request()
            .input('RoleCode', sql.VarChar(50), roleCode)
            .input('FullName', sql.NVarChar(150), fullName)
            .input('Email', sql.VarChar(150), email)
            .input('PasswordHash', sql.VarChar(255), passwordHash)
            .input('PhoneNumber', sql.VarChar(30), phoneNumber || null)
            .output('NewIDUser', sql.Int)
            .execute('SP_Auth_RegisterUser');

        return result.output.NewIDUser as number;
    }

    async getUserByEmail(email: string) {
        const pool = await getDbPool();

        const result = await pool
            .request()
            .input('Email', sql.VarChar(150), email)
            .execute('SP_Auth_GetUserByEmail');

        return result.recordset[0] || null;
    }
}