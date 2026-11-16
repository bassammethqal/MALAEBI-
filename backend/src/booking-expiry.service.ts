import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { DbService } from './db.service';

@Injectable()
export class BookingExpiryService {
 private readonly logger=new Logger(BookingExpiryService.name);
 constructor(private db:DbService) {}
 @Interval(30000)
 async expirePendingBookings() {
  try {
   await this.db.query(`WITH expired AS (
     UPDATE bookings SET status='expired',updated_at=now()
     WHERE status IN ('held','pending') AND expires_at IS NOT NULL AND expires_at<=now()
     RETURNING id
   )
   UPDATE field_occupancies o SET status='released'
   FROM expired e WHERE o.booking_id=e.id AND o.status='active'`);
  } catch(e:any) { this.logger.error('Booking expiry sweep failed',e?.stack||String(e)); }
 }
}
