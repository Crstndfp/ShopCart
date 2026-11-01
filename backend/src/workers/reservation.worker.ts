import cron from 'node-cron';
import { OrderDal } from '../dal/order.dal.js';

const orderDal = new OrderDal();

export function startReservationCleanupWorker(): void {
  // Run every minute: "* * * * *"
  cron.schedule('* * * * *', async () => {
    try {
      const releasedCount = await orderDal.releaseExpiredReservations();
      if (releasedCount > 0) {
        console.log(`[ReservationWorker] Released ${releasedCount} expired stock reservation(s).`);
      }
    } catch (error) {
      console.error('[ReservationWorker] Error releasing expired reservations:', error);
    }
  });

  console.log('⏰ Reservation cleanup worker initialized (schedule: every 1 minute).');
}
