import { Request, Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service.js';
import { AddItemToCartDto, UpdateCartItemDto, MergeCartDto } from '../dtos/cart.dto.js';
import { UnauthorizedError } from '../errors/app-error.js';

export class CartController {
  private service = new CartService();

  getCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await this.service.getCart(req.cartId!);
      res.status(200).json({ statusCode: 200, data: cart });
    } catch (error) {
      next(error);
    }
  };

  addItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as AddItemToCartDto;
      const cart = await this.service.addItem(req.cartId!, dto);
      res.status(200).json({ statusCode: 200, data: cart });
    } catch (error) {
      next(error);
    }
  };

  updateItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const variantId = parseInt(req.params.variantId as string, 10);
      const { quantity } = req.body as UpdateCartItemDto;
      const cart = await this.service.updateItemQuantity(req.cartId!, variantId, quantity);
      res.status(200).json({ statusCode: 200, data: cart });
    } catch (error) {
      next(error);
    }
  };

  removeItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const variantId = parseInt(req.params.variantId as string, 10);
      const cart = await this.service.removeItem(req.cartId!, variantId);
      res.status(200).json({ statusCode: 200, data: cart });
    } catch (error) {
      next(error);
    }
  };

  clearCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.clearCart(req.cartId!);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  mergeCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('You must be logged in to merge a guest cart.');
      }
      const dto = req.body as MergeCartDto;
      const cart = await this.service.mergeGuestCart(dto, req.user.idUser);
      res.status(200).json({ statusCode: 200, data: cart });
    } catch (error) {
      next(error);
    }
  };
}
