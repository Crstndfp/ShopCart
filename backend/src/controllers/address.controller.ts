import { Request, Response, NextFunction } from 'express';
import { AddressService } from '../services/address.service.js';
import { CreateAddressDto } from '../dtos/address.dto.js';

export class AddressController {
  private service = new AddressService();

  createAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dto = req.body as CreateAddressDto;
      const userId = req.user!.idUser;
      const result = await this.service.createAddress(userId, dto);
      res.status(201).json({ statusCode: 201, data: result });
    } catch (error) {
      next(error);
    }
  };

  listAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.idUser;
      const result = await this.service.listAddresses(userId);
      res.status(200).json({ statusCode: 200, data: result });
    } catch (error) {
      next(error);
    }
  };
}
