import argon2 from 'argon2';
import { AuthDal } from '../dal/auth.dal.js';
import { RegisterDto, LoginDto } from '../dtos/auth.dto.js';
import { ConflictError, UnauthorizedError } from '../errors/app-error.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from '../utils/token.util.js';

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    idUser: number;
    fullName: string;
    email: string;
    role: string;
  };
}

export class AuthService {
  private authDal = new AuthDal();

  async register(dto: RegisterDto): Promise<{ idUser: number; message: string }> {
    // 1. Verify if email already exists
    const existing = await this.authDal.getUserByEmail(dto.email);
    if (existing) {
      throw new ConflictError('A user with this email address is already registered.');
    }

    // 2. Hash password securely using Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16, // 64 MB
      timeCost: 3,
    });

    // 3. Register client user in database (RF-01)
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

  async login(dto: LoginDto): Promise<AuthTokensResponse> {
    // 1. Find user by email
    const user = await this.authDal.getUserByEmail(dto.email);
    if (!user || user.IsActive === false) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 2. Verify password with Argon2
    const isPasswordValid = await argon2.verify(user.PasswordHash, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // 3. Generate short-lived JWT Access Token (15 min)
    const tokenPayload = {
      idUser: user.IDUser,
      email: user.Email,
      fullName: user.FullName,
      role: user.RoleCode,
    };
    const accessToken = generateAccessToken(tokenPayload);

    // 4. Generate and store Rotating Refresh Token (7 days)
    const rawRefreshToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.authDal.saveRefreshToken(user.IDUser, tokenHash, expiresAt);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: tokenPayload,
    };
  }

  async refreshToken(rawRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const oldTokenHash = hashRefreshToken(rawRefreshToken);
    const newRawRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRawRefreshToken);
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // SP_Auth_RotateRefreshToken executes atomic rotation and checks for token reuse
    const rotated = await this.authDal.rotateRefreshToken(oldTokenHash, newTokenHash, newExpiresAt);

    // Fetch user details to generate a complete access token
    const user = await this.authDal.getUserByID(rotated.idUser);
    if (!user || user.IsActive === false) {
      throw new UnauthorizedError('User account is inactive or disabled.');
    }

    const accessToken = generateAccessToken({
      idUser: user.IDUser,
      email: user.Email,
      fullName: user.FullName,
      role: user.RoleCode,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(rawRefreshToken);
    await this.authDal.revokeRefreshToken(tokenHash);
  }
}
