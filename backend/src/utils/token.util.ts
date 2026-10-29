import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UserTokenPayload } from '../types/express.js';
import { UnauthorizedError } from '../errors/app-error.js';

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'shopcart_super_secret_access_jwt_key_2026_min_32_chars';
const JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';

export function generateAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, JWT_ACCESS_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRATION as jwt.SignOptions['expiresIn'],
  });
}

export function generateRefreshToken(): string {
  // Generate 64 cryptographically secure random bytes as hex string (128 chars)
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function verifyAccessToken(token: string): UserTokenPayload {
  try {
    return jwt.verify(token, JWT_ACCESS_SECRET) as UserTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}
