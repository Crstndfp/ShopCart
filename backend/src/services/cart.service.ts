import { CartDal } from '../dal/cart.dal.js';
import { AddItemToCartDto, MergeCartDto } from '../dtos/cart.dto.js';
import { logger } from '../utils/logger.util.js';

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
    logger.info(`Item variant ${dto.variantId} (qty: ${dto.quantity}) added to cart #${cartId}`);
    return this.getCart(cartId);
  }

  async updateItemQuantity(cartId: number, variantId: number, quantity: number) {
    await this.dal.updateItemQuantity(cartId, variantId, quantity);
    logger.info(`Cart #${cartId} item variant ${variantId} quantity updated to ${quantity}`);
    return this.getCart(cartId);
  }

  async removeItem(cartId: number, variantId: number) {
    await this.dal.removeItem(cartId, variantId);
    logger.info(`Item variant ${variantId} removed from cart #${cartId}`);
    return this.getCart(cartId);
  }

  async clearCart(cartId: number) {
    await this.dal.clearCart(cartId);
    logger.info(`Cart #${cartId} cleared`);
    return { message: 'Shopping cart cleared successfully' };
  }

  async mergeGuestCart(dto: MergeCartDto, userId: number) {
    await this.dal.mergeGuestCart(dto.guestToken, userId);
    logger.info(`Guest cart token '${dto.guestToken}' merged into User ID ${userId} active cart`);
    const userCartId = await this.dal.getOrCreateCart(userId);
    return this.getCart(userCartId);
  }
}
