import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service.js';
import { CheckoutDto, AdvanceOrderStatusDto, ProcessReturnDto, OrderQueryDto } from '../dtos/order.dto.js';
import { BadRequestError } from '../errors/app-error.js';

export class OrderController {
  private service = new OrderService();

  checkout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.idUser;
      const cartId = req.cartId;

      if (!cartId) {
        throw new BadRequestError('Active cart could not be resolved.');
      }

      const idempotencyKey = (req.headers['idempotency-key'] as string) || '';
      const dto = req.body as CheckoutDto;

      const order = await this.service.checkout(userId, cartId, dto, idempotencyKey);
      res.status(201).json({ statusCode: 201, data: order });
    } catch (error) {
      next(error);
    }
  };

  advanceStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string, 10);
      const dto = req.body as AdvanceOrderStatusDto;
      const userId = req.user!.idUser;

      const updatedOrder = await this.service.advanceStatus(orderId, dto, userId);
      res.status(200).json({ statusCode: 200, data: updatedOrder });
    } catch (error) {
      next(error);
    }
  };

  processReturn = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string, 10);
      const dto = req.body as ProcessReturnDto;
      const userId = req.user!.idUser;

      const result = await this.service.processReturn(orderId, dto, userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };

  getOrderById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const orderId = parseInt(req.params.id as string, 10);
      const userId = req.user!.idUser;
      const role = req.user!.role;

      const order = await this.service.getOrderById(orderId, userId, role);
      res.status(200).json({ statusCode: 200, data: order });
    } catch (error) {
      next(error);
    }
  };

  listOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.idUser;
      const role = req.user!.role;
      const query = req.query as unknown as OrderQueryDto;

      const result = await this.service.listOrders(userId, role, query);
      res.status(200).json({ statusCode: 200, ...result });
    } catch (error) {
      next(error);
    }
  };
}
