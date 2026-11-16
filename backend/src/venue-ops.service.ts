import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbService } from './db.service';
import { ExternalBookingDto, BlockSlotDto } from './dto';

@Injectable()
export class VenueOpsService {
  constructor(private db: DbService) {}

  async assertVenueAccess(userId: string, venueId: string, allowedRoles: string[] = ['owner', 'manager', 'receptionist']) {
    const r = await this.db.query<any>(
      `SELECT v.id, v.owner_user_id, vm.role, vm.status as member_status
       FROM venues v
       LEFT JOIN venue_members vm ON vm.venue_id = v.id AND vm.user_id = $2 AND vm.status = 'active'
       WHERE v.id = $1 AND v.status = 'active'`,
      [venueId, userId]
    );

    if (!r.rowCount) {
      throw new NotFoundException('Venue not found or inactive');
    }

    const row = r.rows[0];
    const isOwner = row.owner_user_id === userId;
    const isMember = row.role && allowedRoles.includes(row.role) && row.member_status === 'active';

    if (!isOwner && !isMember) {
      throw new ForbiddenException('You do not have authorization to manage this venue');
    }

    return {
      venue_id: venueId,
      user_id: userId,
      role: isOwner ? 'owner' : row.role
    };
  }

  async listBookings(userId: string, venueId: string, query: any) {
    await this.assertVenueAccess(userId, venueId);

    const values: any[] = [venueId];
    const where: string[] = ['f.venue_id = $1'];

    if (query.status) {
      values.push(query.status);
      where.push(`b.status = $${values.length}`);
    }
    if (query.field_id) {
      values.push(query.field_id);
      where.push(`o.field_id = $${values.length}`);
    }
    if (query.from) {
      values.push(query.from);
      where.push(`o.starts_at >= $${values.length}`);
    }
    if (query.to) {
      values.push(query.to);
      where.push(`o.ends_at <= $${values.length}`);
    }

    const r = await this.db.query<any>(
      `SELECT b.id, b.booking_no, b.status, b.source, b.total_price, b.currency,
              b.duration_minutes, b.expires_at, b.confirmed_at, b.cancelled_at, b.created_at,
              b.external_customer_name, b.external_customer_phone,
              o.field_id, f.name as field_name, o.starts_at, o.ends_at,
              u.phone as player_phone, u.full_name as player_name
       FROM bookings b
       JOIN field_occupancies o ON o.booking_id = b.id
       JOIN fields f ON f.id = o.field_id
       LEFT JOIN users u ON u.id = b.player_user_id
       WHERE ${where.join(' AND ')}
       ORDER BY o.starts_at DESC
       LIMIT 100`,
      values
    );

    return { data: r.rows, meta: { total: r.rowCount || 0 } };
  }

  async approveBooking(userId: string, venueId: string, bookingId: string) {
    await this.assertVenueAccess(userId, venueId);

    return this.db.tx(async (c) => {
      const r = await c.query<any>(
        `SELECT b.id, b.booking_no, b.status, b.expires_at, b.player_user_id,
                o.id as occupancy_id, o.starts_at, f.venue_id
         FROM bookings b
         JOIN field_occupancies o ON o.booking_id = b.id
         JOIN fields f ON f.id = o.field_id
         WHERE b.id = $1 AND f.venue_id = $2
         FOR UPDATE OF b, o`,
        [bookingId, venueId]
      );

      if (!r.rowCount) {
        throw new NotFoundException('Booking not found for this venue');
      }

      const b = r.rows[0];
      if (b.status !== 'pending') {
        throw new BadRequestException(`Cannot approve booking in status '${b.status}'`);
      }

      if (b.expires_at && new Date(b.expires_at).getTime() <= Date.now()) {
        throw new ConflictException('Booking approval window has expired');
      }

      await c.query(
        `UPDATE bookings
         SET status = 'confirmed', confirmed_at = now(), expires_at = NULL, updated_at = now()
         WHERE id = $1`,
        [bookingId]
      );

      await c.query(
        `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'booking.approve', 'booking', $3, $4::jsonb)`,
        [userId, venueId, bookingId, JSON.stringify({ booking_no: b.booking_no })]
      );

      if (b.player_user_id) {
        await c.query(
          `INSERT INTO notifications(user_id, channel, title, body, status)
           VALUES ($1, 'in_app', 'تم تأكيد حجزك', $2, 'queued')`,
          [b.player_user_id, `تمت موافقة المنشأة على حجزك رقم ${b.booking_no}`]
        );
      }

      return {
        success: true,
        booking_id: bookingId,
        status: 'confirmed',
        confirmed_at: new Date().toISOString()
      };
    });
  }

  async rejectBooking(userId: string, venueId: string, bookingId: string, reason?: string) {
    await this.assertVenueAccess(userId, venueId);

    return this.db.tx(async (c) => {
      const r = await c.query<any>(
        `SELECT b.id, b.booking_no, b.status, b.player_user_id,
                o.id as occupancy_id, f.venue_id
         FROM bookings b
         JOIN field_occupancies o ON o.booking_id = b.id
         JOIN fields f ON f.id = o.field_id
         WHERE b.id = $1 AND f.venue_id = $2
         FOR UPDATE OF b, o`,
        [bookingId, venueId]
      );

      if (!r.rowCount) {
        throw new NotFoundException('Booking not found for this venue');
      }

      const b = r.rows[0];
      if (b.status !== 'pending') {
        throw new BadRequestException(`Cannot reject booking in status '${b.status}'`);
      }

      const rejectionReason = reason || 'رفض من المنشأة';

      await c.query(
        `UPDATE bookings
         SET status = 'rejected',
             cancellation_reason = $2,
             cancelled_by_user_id = $3,
             cancellation_actor_type = 'venue',
             cancelled_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [bookingId, rejectionReason, userId]
      );

      await c.query(
        `UPDATE field_occupancies SET status = 'released' WHERE id = $1`,
        [b.occupancy_id]
      );

      await c.query(
        `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'booking.reject', 'booking', $3, $4::jsonb)`,
        [userId, venueId, bookingId, JSON.stringify({ booking_no: b.booking_no, reason: rejectionReason })]
      );

      if (b.player_user_id) {
        await c.query(
          `INSERT INTO notifications(user_id, channel, title, body, status)
           VALUES ($1, 'in_app', 'تعذر قبول الحجز', $2, 'queued')`,
          [b.player_user_id, `تعذر قبول حجزك رقم ${b.booking_no}: ${rejectionReason}`]
        );
      }

      return {
        success: true,
        booking_id: bookingId,
        status: 'rejected',
        reason: rejectionReason
      };
    });
  }

  async completeBooking(userId: string, venueId: string, bookingId: string) {
    await this.assertVenueAccess(userId, venueId);

    return this.db.tx(async (c) => {
      const r = await c.query<any>(
        `SELECT b.id, b.booking_no, b.status
         FROM bookings b
         JOIN field_occupancies o ON o.booking_id = b.id
         JOIN fields f ON f.id = o.field_id
         WHERE b.id = $1 AND f.venue_id = $2
         FOR UPDATE OF b`,
        [bookingId, venueId]
      );

      if (!r.rowCount) {
        throw new NotFoundException('Booking not found for this venue');
      }

      const b = r.rows[0];
      if (b.status !== 'confirmed') {
        throw new BadRequestException(`Cannot complete booking in status '${b.status}'`);
      }

      await c.query(
        `UPDATE bookings SET status = 'completed', updated_at = now() WHERE id = $1`,
        [bookingId]
      );

      await c.query(
        `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'booking.complete', 'booking', $3, $4::jsonb)`,
        [userId, venueId, bookingId, JSON.stringify({ booking_no: b.booking_no })]
      );

      return {
        success: true,
        booking_id: bookingId,
        status: 'completed'
      };
    });
  }

  async createExternalBooking(userId: string, venueId: string, dto: ExternalBookingDto) {
    await this.assertVenueAccess(userId, venueId);

    const start = new Date(dto.starts_at);
    if (!Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
      throw new BadRequestException('Booking start time must be a valid future timestamp');
    }
    const end = new Date(start.getTime() + 3600000);

    try {
      return await this.db.tx(async (c) => {
        const field = await c.query<any>(
          `SELECT f.id, f.venue_id, f.name
           FROM fields f
           JOIN venues v ON v.id = f.venue_id
           WHERE f.id = $1 AND f.venue_id = $2 AND f.status = 'active' AND v.status = 'active'
           FOR UPDATE OF f`,
          [dto.field_id, venueId]
        );

        if (!field.rowCount) {
          throw new NotFoundException('Field not found in this venue or inactive');
        }

        const local = await c.query<any>(
          `SELECT EXTRACT(DOW FROM $1::timestamptz AT TIME ZONE 'Asia/Aden')::int weekday,
                  ($1::timestamptz AT TIME ZONE 'Asia/Aden')::time local_time`,
          [start.toISOString()]
        );
        const day = local.rows[0];

        const priceResult = await c.query<any>(
          `SELECT price, currency
           FROM pricing_rules
           WHERE field_id = $1 AND active = true AND (weekday IS NULL OR weekday = $2)
             AND starts_at <= $3 AND ends_at >= ($3::time + interval '60 minutes')
           ORDER BY priority DESC LIMIT 1`,
          [dto.field_id, day.weekday, day.local_time]
        );

        const price = priceResult.rowCount ? Number(priceResult.rows[0].price) : 0;
        const currency = priceResult.rowCount ? priceResult.rows[0].currency : 'YER';
        const bookingNo = `EXT-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4).toUpperCase()}`;

        const b = await c.query<any>(
          `INSERT INTO bookings(
             booking_no, player_user_id, status, source, duration_minutes, total_price, currency,
             deposit_required, deposit_paid, remaining_amount, price_snapshot, policy_snapshot,
             confirmation_snapshot, confirmed_at, external_customer_name, external_customer_phone
           )
           VALUES(
             $1, NULL, 'confirmed', 'external', 60, $2, $3, 0, 0, $2,
             $4::jsonb, $5::jsonb, $6::jsonb, now(), $7, $8
           )
           RETURNING id, booking_no, status, total_price, currency, created_at`,
          [
            bookingNo,
            price,
            currency,
            JSON.stringify({ price, currency, notes: dto.notes || '' }),
            JSON.stringify({ source: 'external', actor: userId }),
            JSON.stringify({ confirmation_mode: 'external' }),
            dto.customer_name || null,
            dto.customer_phone || null
          ]
        );

        await c.query(
          `INSERT INTO field_occupancies(field_id, starts_at, ends_at, occupancy_type, status, booking_id)
           VALUES($1, $2, $3, 'booking', 'active', $4)`,
          [dto.field_id, start.toISOString(), end.toISOString(), b.rows[0].id]
        );

        await c.query(
          `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
           VALUES ($1, $2, 'booking.create_external', 'booking', $3, $4::jsonb)`,
          [userId, venueId, b.rows[0].id, JSON.stringify({ booking_no: bookingNo, customer: dto.customer_name })]
        );

        return {
          ...b.rows[0],
          field_id: dto.field_id,
          venue_id: venueId,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          external_customer_name: dto.customer_name || null,
          external_customer_phone: dto.customer_phone || null
        };
      });
    } catch (e: any) {
      if (e.code === '23P01' || e.code === '23505') {
        throw new ConflictException('The selected time slot is already occupied');
      }
      throw e;
    }
  }

  async blockSlot(userId: string, venueId: string, fieldId: string, dto: BlockSlotDto) {
    await this.assertVenueAccess(userId, venueId);

    const start = new Date(dto.starts_at);
    const end = new Date(dto.ends_at);

    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
      throw new BadRequestException('starts_at and ends_at must be valid ISO-8601 timestamps');
    }
    if (start.getTime() >= end.getTime()) {
      throw new BadRequestException('ends_at must be after starts_at');
    }

    const occupancyType = dto.occupancy_type || 'maintenance';

    try {
      return await this.db.tx(async (c) => {
        const field = await c.query<any>(
          `SELECT f.id FROM fields f JOIN venues v ON v.id = f.venue_id
           WHERE f.id = $1 AND f.venue_id = $2 AND f.status = 'active' AND v.status = 'active'`,
          [fieldId, venueId]
        );

        if (!field.rowCount) {
          throw new NotFoundException('Field not found in this venue or inactive');
        }

        const r = await c.query<any>(
          `INSERT INTO field_occupancies(field_id, starts_at, ends_at, occupancy_type, status, reason, created_by)
           VALUES($1, $2, $3, $4, 'active', $5, $6)
           RETURNING id, field_id, starts_at, ends_at, occupancy_type, status, reason, created_at`,
          [fieldId, start.toISOString(), end.toISOString(), occupancyType, dto.reason || null, userId]
        );

        await c.query(
          `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
           VALUES ($1, $2, 'field.block_slot', 'field_occupancy', $3, $4::jsonb)`,
          [userId, venueId, r.rows[0].id, JSON.stringify({ reason: dto.reason, occupancy_type: occupancyType })]
        );

        return r.rows[0];
      });
    } catch (e: any) {
      if (e.code === '23P01' || e.code === '23505') {
        throw new ConflictException('The block time overlaps with an existing booking or block');
      }
      throw e;
    }
  }
}
