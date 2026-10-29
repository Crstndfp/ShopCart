import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';

export function validateBody(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Validation failed',
          issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        });
        return;
      }
      next(error);
    }
  };
}

export function validateQuery(schema: ZodType) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid query parameters',
          issues: error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
        });
        return;
      }
      next(error);
    }
  };
}
