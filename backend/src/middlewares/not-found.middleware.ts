import { NextFunction, Request, Response } from 'express';
import { NotFoundError } from '../errors/app-error.js';

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
}