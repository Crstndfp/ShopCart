import { Request, Response, NextFunction } from 'express';
import { ConfigurationService } from '../services/configuration.service.js';
import { UpdateConfigurationDto } from '../dtos/configuration.dto.js';

export class ConfigurationController {
  private service = new ConfigurationService();

  getConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.params.key as string;
      const config = await this.service.getConfiguration(key);
      res.status(200).json({ statusCode: 200, data: config });
    } catch (error) {
      next(error);
    }
  };

  updateConfiguration = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = req.params.key as string;
      const dto = req.body as UpdateConfigurationDto;
      const userId = req.user!.idUser;
      const updated = await this.service.updateConfiguration(key, dto.newValue, userId);
      res.status(200).json({ statusCode: 200, data: updated });
    } catch (error) {
      next(error);
    }
  };
}
