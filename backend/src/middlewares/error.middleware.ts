import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars                                                            
    next: NextFunction
): void {
    const isDevelopment = process.env.NODE_ENV !== 'production';

    // 1. Error operacional conocido (AppError: BadRequest, Conflict, NotFound, etc.)                                        
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            statusCode: err.statusCode,
            error: err.constructor.name.replace('Error', ''),
            message: err.message,
            details: err.details || null,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            ...(isDevelopment && { stack: err.stack }),
        });
        return;
    }

    // 2. Error de validación de Zod                                                                                         
    if (err instanceof ZodError) {
        res.status(400).json({
            statusCode: 400,
            error: 'BadRequest',
            message: 'Validation failed',
            details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
        });
        return;
    }

    // 3. Errores lanzados por SQL Server (MSSQL Driver)                                                                     
    // Por ejemplo, los RAISERROR que definimos en los Stored Procedures                                                     
    if (err.name === 'RequestError' || (err as any).number) {
        const mssqlErr = err as any;
        let statusCode = 400;

        // Mapeo inteligente según mensajes de negocio de nuestros SPs                                                         
        if (mssqlErr.message.includes('EMAIL_ALREADY_EXISTS') || mssqlErr.number === 2627 || mssqlErr.number === 2601) {
            statusCode = 409; // Conflict                                                                                        
        } else if (mssqlErr.message.includes('FORBIDDEN_ACCESS')) {
            statusCode = 403; // Forbidden                                                                                       
        } else if (mssqlErr.message.includes('NOT_FOUND')) {
            statusCode = 404; // Not Found                                                                                       
        }

        res.status(statusCode).json({
            statusCode,
            error: 'DatabaseError',
            message: mssqlErr.message,
            timestamp: new Date().toISOString(),
            path: req.originalUrl,
            ...(isDevelopment && { stack: err.stack }),
        });
        return;
    }

    // 4. Error no previsto (Bugs de programación o caídas inesperadas)                                                      
    console.error('💥 Unhandled Exception:', err);

    res.status(500).json({
        statusCode: 500,
        error: 'InternalServerError',
        message: isDevelopment ? err.message : 'An unexpected error occurred on the server.',
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        ...(isDevelopment && { stack: err.stack }),
    });
}