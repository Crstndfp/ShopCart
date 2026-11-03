import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';
import { logger } from '../utils/logger.util.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // 1. Known Operational Errors (AppError: BadRequest, Conflict, NotFound, Forbidden, Unauthorized)
  if (err instanceof AppError) {
    logger.warn(`[${err.constructor.name}] ${req.method} ${req.originalUrl} -> ${err.statusCode}: ${err.message}`, {
      details: err.details || null,
      path: req.originalUrl,
    });

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

  // 2. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const issues = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    logger.warn(`[ValidationError] ${req.method} ${req.originalUrl} -> 400 Bad Request`, { issues });

    res.status(400).json({
      statusCode: 400,
      error: 'BadRequest',
      message: 'Validation failed',
      details: issues,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
    return;
  }

  // 3. SQL Server Driver / Stored Procedure Errors (RAISERROR)
  if (err.name === 'RequestError' || (err as any).number) {
    const mssqlErr = err as any;
    let statusCode = 400;

    if (
      mssqlErr.message.includes('EMAIL_ALREADY_EXISTS') ||
      mssqlErr.number === 2627 ||
      mssqlErr.number === 2601
    ) {
      statusCode = 409;
    } else if (mssqlErr.message.includes('FORBIDDEN_ACCESS')) {
      statusCode = 403;
    } else if (mssqlErr.message.includes('NOT_FOUND')) {
      statusCode = 404;
    }

    logger.warn(`[DatabaseError] ${req.method} ${req.originalUrl} -> ${statusCode}: ${mssqlErr.message}`, {
      code: mssqlErr.code,
      number: mssqlErr.number,
    });

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

  // 4. Unhandled Unexpected System Exceptions (500)
  logger.error(`Unhandled Exception on ${req.method} ${req.originalUrl}: ${err.message}`, err, {
    query: req.query,
    body: req.body,
  });

  res.status(500).json({
    statusCode: 500,
    error: 'InternalServerError',
    message: isDevelopment ? err.message : 'An unexpected error occurred on the server.',
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    ...(isDevelopment && { stack: err.stack }),
  });
}
