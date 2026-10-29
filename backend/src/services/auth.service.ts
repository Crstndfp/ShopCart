import argon2 from 'argon2';
import { AuthDal } from '../dal/auth.dal.js';
import { RegisterDto } from '../dtos/auth.dto.js';

export class AuthService {
    private authDal = new AuthDal();

    async register(dto: RegisterDto): Promise<{ idUser: number; message: string }> {
        // 1. Verificar si el correo ya existe                                                                                                                                                       
        const existing = await this.authDal.getUserByEmail(dto.email);
        if (existing) {
            const error = new Error('A user with this email already exists.');
            (error as any).statusCode = 409;
            throw error;
        }

        // 2. Hash seguro con Argon2id                                                                                                                                                               
        const passwordHash = await argon2.hash(dto.password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16, // 64 MB                                                                                                                                                              
            timeCost: 3,
        });

        // 3. Crear usuario con rol 'CLIENT' en DB                                                                                                                                                   
        const idUser = await this.authDal.registerUser(
            'CLIENT',
            dto.fullName,
            dto.email,
            passwordHash,
            dto.phoneNumber
        );

        return {
            idUser,
            message: 'User registered successfully',
        };
    }
}