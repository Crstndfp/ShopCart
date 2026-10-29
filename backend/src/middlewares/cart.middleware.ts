import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { CartDal } from '../dal/cart.dal.js';
import { verifyAccessToken } from '../utils/token.util.js';

const cartDal = new CartDal();

export async function resolveCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let userId: number | undefined;

    // 1. Check if authenticated user
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = verifyAccessToken(token);
        req.user = payload;
        userId = payload.idUser;
      } catch {
        // Token invalid or expired, continue as guest
      }
    }

    // 2. If not authenticated, handle guest token
    let guestToken: string | undefined;
    if (!userId) {
      const headerToken = req.headers['x-guest-token'];
      if (typeof headerToken === 'string' && headerToken.trim().length >= 10) {
        guestToken = headerToken.trim();
      } else {
        guestToken = crypto.randomUUID();
      }
      req.guestToken = guestToken;
      res.setHeader('X-Guest-Token', guestToken);
    }

    // 3. Resolve or create active cart ID in SQL Server
    const cartId = await cartDal.getOrCreateCart(userId, guestToken);
    req.cartId = cartId;

    next();
  } catch (error) {
    next(error);
  }
}
