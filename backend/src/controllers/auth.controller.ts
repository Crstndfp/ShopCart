import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { RegisterDto } from '../dtos/auth.dto.js';

export class AuthController {
    private authService = new AuthService();

    register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const dto = req.body as RegisterDto;
            const result = await this.authService.register(dto);

            res.status(201).json({
                statusCode: 201,
                data: result,
            });
        } catch (error) {
            next(error); // Pasa el error al middleware global de errores
        }
    };
}