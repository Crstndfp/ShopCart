import { AddressDal, AddressRecord } from '../dal/address.dal.js';
import { CreateAddressDto } from '../dtos/address.dto.js';

export class AddressService {
  private dal = new AddressDal();

  public async createAddress(userId: number, dto: CreateAddressDto): Promise<AddressRecord> {
    const idAddress = await this.dal.createAddress(userId, dto);
    const addresses = await this.dal.listAddressesByUser(userId);
    const created = addresses.find((a) => a.IDAddress === idAddress);
    return created!;
  }

  public async listAddresses(userId: number): Promise<AddressRecord[]> {
    return await this.dal.listAddressesByUser(userId);
  }
}
