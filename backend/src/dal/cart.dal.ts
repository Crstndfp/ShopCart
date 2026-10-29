import sql from 'mssql';
import { getDbPool } from '../config/database.js';

export class CartDal {
  async getOrCreateCart(userId?: number, guestToken?: string): Promise<number> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('IDUser', sql.Int, userId || null)
      .input('GuestToken', sql.VarChar(100), guestToken || null)
      .output('IDCart', sql.Int)
      .execute('SP_Cart_GetOrCreate');

    return result.output.IDCart as number;
  }

  async addItem(cartId: number, variantId: number, quantity: number): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDCart', sql.Int, cartId)
      .input('IDVariant', sql.Int, variantId)
      .input('Quantity', sql.Int, quantity)
      .execute('SP_Cart_AddItem');
  }

  async updateItemQuantity(cartId: number, variantId: number, quantity: number): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDCart', sql.Int, cartId)
      .input('IDVariant', sql.Int, variantId)
      .input('NewQuantity', sql.Int, quantity)
      .execute('SP_Cart_UpdateItemQuantity');
  }

  async removeItem(cartId: number, variantId: number): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDCart', sql.Int, cartId)
      .input('IDVariant', sql.Int, variantId)
      .execute('SP_Cart_RemoveItem');
  }

  async clearCart(cartId: number): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('IDCart', sql.Int, cartId)
      .execute('SP_Cart_Clear');
  }

  async getCartDetails(cartId: number): Promise<{ header: any; items: any[] }> {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input('IDCart', sql.Int, cartId)
      .execute('SP_Cart_GetCartDetails');

    const recordsets = result.recordsets as sql.IRecordSet<any>[];
    const header = recordsets[0]?.[0] || null;
    const items = recordsets[1] || [];

    return { header, items };
  }

  async mergeGuestCart(guestToken: string, userId: number): Promise<void> {
    const pool = await getDbPool();

    await pool
      .request()
      .input('GuestToken', sql.VarChar(100), guestToken)
      .input('IDUser', sql.Int, userId)
      .execute('SP_Cart_MergeGuestCart');
  }
}
