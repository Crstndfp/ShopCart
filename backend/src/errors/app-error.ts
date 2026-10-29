export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(message: string, statusCode = 500, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true; // Errores previstos del negocio vs bugs de programación                                    
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Subclases semánticas (HTTP Status Codes)                                                                                
export class BadRequestError extends AppError {
    constructor(message: string, details?: unknown) {
        super(message, 400, details);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden resource') {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409);
    }
}