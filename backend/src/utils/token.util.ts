import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { UserTokenPayload } from '../types/express.js';
import { UnauthorizedError } from '../errors/app-error.js';
import { env } from '../config/env.js';

export function generateAccessToken(payload: UserTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION as jwt.SignOptions['expiresIn'],
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
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as UserTokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Access token has expired');
    }
    throw new UnauthorizedError('Invalid access token');
  }
}
