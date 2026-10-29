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

    async getUserByID(idUser: number) {
        const pool = await getDbPool();

        const result = await pool
            .request()
            .input('IDUser', sql.Int, idUser)
            .execute('SP_Auth_GetUserByID');

        return result.recordset[0] || null;
    }

    async saveRefreshToken(idUser: number, tokenHash: string, expiresAt: Date): Promise<void> {
        const pool = await getDbPool();

        await pool
            .request()
            .input('IDUser', sql.Int, idUser)
            .input('TokenHash', sql.VarChar(128), tokenHash)
            .input('ExpiresAt', sql.DateTime2(3), expiresAt)
            .execute('SP_Auth_SaveRefreshToken');
    }

    async rotateRefreshToken(
        oldTokenHash: string,
        newTokenHash: string,
        newExpiresAt: Date
    ): Promise<{ idUser: number; roleCode: string }> {
        const pool = await getDbPool();

        const result = await pool
            .request()
            .input('OldTokenHash', sql.VarChar(128), oldTokenHash)
            .input('NewTokenHash', sql.VarChar(128), newTokenHash)
            .input('NewExpiresAt', sql.DateTime2(3), newExpiresAt)
            .output('UserID', sql.Int)
            .output('RoleCode', sql.VarChar(50))
            .execute('SP_Auth_RotateRefreshToken');

        return {
            idUser: result.output.UserID as number,
            roleCode: result.output.RoleCode as string,
        };
    }

    async revokeRefreshToken(tokenHash: string): Promise<void> {
        const pool = await getDbPool();

        await pool
            .request()
            .input('TokenHash', sql.VarChar(128), tokenHash)
            .execute('SP_Auth_RevokeRefreshToken');
    }
}