import { Request, Response, NextFunction } from 'express';
import { logger, maskSensitiveData } from '../utils/logger.util.js';

/**
 * HTTP Request Logger Middleware
 * Logs incoming request details (method, path, query, sanitized body, headers)
 * and completed response status with execution duration in milliseconds.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  // Log incoming request details
  const hasBody = req.body && Object.keys(req.body).length > 0;
  const hasQuery = req.query && Object.keys(req.query).length > 0;

  const metadata: Record<string, any> = {};
  if (hasQuery) {
    metadata.query = req.query;
  }
  if (hasBody) {
    metadata.body = maskSensitiveData(req.body);
  }
  if (req.headers['x-guest-token']) {
    metadata.guestToken = req.headers['x-guest-token'];
  }
  if (req.headers['idempotency-key']) {
    metadata.idempotencyKey = req.headers['idempotency-key'];
  }
  if (req.headers.authorization) {
    metadata.auth = 'Bearer [present]';
  }

  logger.http(`--> INCOMING  ${method} ${originalUrl}`, Object.keys(metadata).length > 0 ? metadata : undefined);

  // Log completed response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const statusCategory = Math.floor(statusCode / 100);

    const message = `<-- COMPLETED ${method} ${originalUrl} -> ${statusCode} (${duration}ms)`;

    if (statusCategory === 2) {
      logger.http(`✅ ${message}`);
    } else if (statusCategory === 4) {
      logger.warn(`⚠️ ${message}`);
    } else if (statusCategory >= 5) {
      logger.error(`❌ ${message}`);
    } else {
      logger.http(`ℹ️ ${message}`);
    }
  });

  next();
}
