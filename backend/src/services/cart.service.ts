import { CartDal } from '../dal/cart.dal.js';
import { AddItemToCartDto, MergeCartDto } from '../dtos/cart.dto.js';

export class CartService {
  private dal = new CartDal();

  async getCart(cartId: number) {
    const { header, items } = await this.dal.getCartDetails(cartId);

    // Format attributes JSON string if present
    const formattedItems = items.map((item) => ({
      ...item,
      Attributes: typeof item.AttributesJson === 'string' ? JSON.parse(item.AttributesJson) : item.AttributesJson,
    }));

    return {
      cart: header,
      items: formattedItems,
    };
  }

  async addItem(cartId: number, dto: AddItemToCartDto) {
    await this.dal.addItem(cartId, dto.variantId, dto.quantity);
    return this.getCart(cartId);
  }

  async updateItemQuantity(cartId: number, variantId: number, quantity: number) {
    await this.dal.updateItemQuantity(cartId, variantId, quantity);
    return this.getCart(cartId);
  }

  async removeItem(cartId: number, variantId: number) {
    await this.dal.removeItem(cartId, variantId);
    return this.getCart(cartId);
  }

  async clearCart(cartId: number) {
    await this.dal.clearCart(cartId);
    return { message: 'Shopping cart cleared successfully' };
  }

  async mergeGuestCart(dto: MergeCartDto, userId: number) {
    await this.dal.mergeGuestCart(dto.guestToken, userId);
    const userCartId = await this.dal.getOrCreateCart(userId);
    return this.getCart(userCartId);
  }
}
