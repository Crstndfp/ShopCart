import { ConfigurationDal } from '../dal/configuration.dal.js';
import { NotFoundError, BadRequestError } from '../errors/app-error.js';

export class ConfigurationService {
  private dal = new ConfigurationDal();

  public async getConfiguration(key: string) {
    const config = await this.dal.getByKey(key);
    if (!config) {
      throw new NotFoundError(`Configuration key '${key}' not found.`);
    }
    return config;
  }

  public async updateConfiguration(key: string, newValue: string, userId: number) {
    try {
      await this.dal.updateKey(key, newValue, userId);
      return await this.dal.getByKey(key);
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('CONFIG_NOT_FOUND')) {
        throw new NotFoundError(`Configuration key '${key}' not found.`);
      }
      if (msg.includes('CONFIG_NOT_EDITABLE')) {
        throw new BadRequestError(`Configuration key '${key}' is system-locked and cannot be edited.`);
      }
      throw error;
    }
  }
}
