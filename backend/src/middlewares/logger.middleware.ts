import { Request, Response, NextFunction } from 'express';

/**
 * HTTP Request Logger Middleware
 * Logs incoming HTTP method, URL, status code, and response time in milliseconds.
 * Provides live observability during manual API tests and evaluation demos.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    const statusCategory = Math.floor(statusCode / 100);
    const indicator =
      statusCategory === 2 ? '✅' : statusCategory === 4 ? '⚠️' : statusCategory === 5 ? '❌' : 'ℹ️';

    console.log(
      `${indicator} [HTTP] ${timestamp} | ${method.padEnd(6)} ${originalUrl} -> ${statusCode} (${duration}ms)`
    );
  });

  next();
}
