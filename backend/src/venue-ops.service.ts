import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbService } from './db.service';
import { SupabaseService } from './supabase.service';
import { ExternalBookingDto, BlockSlotDto, UpdateBookingSettingsDto, AddVenueMemberDto, CreateVenueDto, UpdateVenueDto, CreateFieldDto } from './dto';

@Injectable()
export class VenueOpsService {
  constructor(private db: DbService, private supabase: SupabaseService) {}

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

  async listOwnerVenues(userId: string) {
    const venuesRes = await this.db.query<any>(
      `SELECT v.id, v.owner_user_id, v.name, v.description, v.address_text, v.status,
              a.name as area_name,
              CASE WHEN v.owner_user_id = $1 THEN 'owner' ELSE vm.role::text END as user_role,
              (SELECT image_url FROM venue_images vi WHERE vi.venue_id = v.id ORDER BY vi.sort_order LIMIT 1) as cover_image_url,
              COALESCE((SELECT json_agg(json_build_object('id', vi.id, 'image_url', vi.image_url, 'sort_order', vi.sort_order)) FROM venue_images vi WHERE vi.venue_id = v.id), '[]'::json) as images
       FROM venues v
       LEFT JOIN areas a ON a.id = v.area_id
       LEFT JOIN venue_members vm ON vm.venue_id = v.id AND vm.user_id = $1 AND vm.status = 'active'
       WHERE (v.owner_user_id = $1 OR (vm.user_id = $1 AND vm.status = 'active'))
         AND v.status = 'active'
       ORDER BY v.created_at DESC`,
      [userId]
    );

    const venues = venuesRes.rows;
    for (const v of venues) {
      const fieldsRes = await this.db.query<any>(
        `SELECT f.id, f.venue_id, f.name, f.sport_type, f.surface_type, f.status,
                COALESCE(bs.confirmation_mode, 'approval'::confirmation_mode) as confirmation_mode,
                COALESCE(bs.instant_booking_enabled, false) as instant_booking_enabled,
                (SELECT min(price) FROM pricing_rules pr WHERE pr.field_id = f.id AND pr.active) as hourly_price_from
         FROM fields f
         LEFT JOIN booking_settings bs ON bs.field_id = f.id
         WHERE f.venue_id = $1 AND f.status = 'active'
         ORDER BY f.created_at ASC`,
        [v.id]
      );
      v.fields = fieldsRes.rows;
      v.default_field_id = fieldsRes.rows[0]?.id || null;
    }

    return { data: venues };
  }

  async getVenueSummary(userId: string, venueId: string) {
    await this.assertVenueAccess(userId, venueId);

    const res = await this.db.query<any>(
      `WITH today_range AS (
         SELECT 
           (CURRENT_DATE AT TIME ZONE 'Asia/Aden') as day_start,
           ((CURRENT_DATE + interval '1 day') AT TIME ZONE 'Asia/Aden') as day_end
       )
       SELECT 
         COUNT(b.id) FILTER (
           WHERE b.status = 'confirmed' 
             AND o.starts_at >= tr.day_start 
             AND o.starts_at < tr.day_end
         )::int AS confirmed_today,
         COUNT(b.id) FILTER (
           WHERE b.status = 'pending'
         )::int AS pending_approval,
         COUNT(b.id) FILTER (
           WHERE b.status = 'confirmed' 
             AND b.source = 'external' 
             AND o.starts_at >= tr.day_start 
             AND o.starts_at < tr.day_end
         )::int AS external_today,
         COALESCE(SUM(b.total_price) FILTER (
           WHERE b.status IN ('confirmed', 'completed')
             AND o.starts_at >= tr.day_start 
             AND o.starts_at < tr.day_end
         ), 0)::float AS expected_revenue_today
       FROM today_range tr
       CROSS JOIN fields f
       LEFT JOIN field_occupancies o ON o.field_id = f.id
       LEFT JOIN bookings b ON b.id = o.booking_id
       WHERE f.venue_id = $1`,
      [venueId]
    );

    const fieldsRes = await this.db.query<any>(
      `SELECT COUNT(*)::int as active_fields_count FROM fields WHERE venue_id = $1 AND status = 'active'`,
      [venueId]
    );
    const activeFields = Number(fieldsRes.rows[0]?.active_fields_count || 1);

    // Distribution for Donut Chart
    const distRes = await this.db.query<any>(
      `SELECT b.status, COUNT(DISTINCT b.id)::int as cnt
       FROM bookings b
       JOIN field_occupancies o ON o.booking_id = b.id
       JOIN fields f ON f.id = o.field_id
       WHERE f.venue_id = $1
       GROUP BY b.status`,
      [venueId]
    );

    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    distRes.rows.forEach((r: any) => {
      if (r.status === 'confirmed' || r.status === 'completed') confirmedCount += Number(r.cnt);
      else if (r.status === 'pending') pendingCount += Number(r.cnt);
      else if (r.status === 'cancelled' || r.status === 'rejected') cancelledCount += Number(r.cnt);
    });
    const totalDist = confirmedCount + pendingCount + cancelledCount;

    // Last 7 days revenue
    const last7Res = await this.db.query<any>(
      `WITH days AS (
         SELECT generate_series(
           (CURRENT_DATE - interval '6 days')::date,
           CURRENT_DATE::date,
           '1 day'::interval
         )::date AS d
       )
       SELECT 
         days.d as date_str,
         TO_CHAR(days.d, 'Dy') as day_code,
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0)::float as revenue,
         COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))::int as bookings_count
       FROM days
       LEFT JOIN field_occupancies o ON (o.starts_at AT TIME ZONE 'Asia/Aden')::date = days.d
       LEFT JOIN fields f ON f.id = o.field_id AND f.venue_id = $1
       LEFT JOIN bookings b ON b.id = o.booking_id
       GROUP BY days.d
       ORDER BY days.d ASC`,
      [venueId]
    );

    const arDays: Record<string, string> = {
      'Sat': 'السبت',
      'Sun': 'الأحد',
      'Mon': 'الإثنين',
      'Tue': 'الثلاثاء',
      'Wed': 'الأربعاء',
      'Thu': 'الخميس',
      'Fri': 'الجمعة'
    };

    const last7Days = last7Res.rows.map((rRow: any) => ({
      date: rRow.date_str,
      day_name: arDays[rRow.day_code?.trim()] || rRow.day_code?.trim(),
      revenue: Number(rRow.revenue || 0),
      bookings_count: Number(rRow.bookings_count || 0)
    }));

    const row = res.rows[0] || {};
    const confirmedToday = Number(row.confirmed_today || 0);
    const occupancyRate = activeFields > 0 
      ? Math.min(100, Math.round((confirmedToday / (activeFields * 18)) * 100))
      : 0;

    return {
      confirmed_today: confirmedToday,
      pending_approval: Number(row.pending_approval || 0),
      external_today: Number(row.external_today || 0),
      expected_revenue_today: Number(row.expected_revenue_today || 0),
      occupancy_rate: occupancyRate,
      active_fields_count: activeFields,
      currency: 'YER',
      status_distribution: {
        confirmed: confirmedCount,
        pending: pendingCount,
        cancelled: cancelledCount,
        total: totalDist
      },
      last_7_days_revenue: last7Days
    };
  }

  async listVenueCustomers(userId: string, venueId: string) {
    await this.assertVenueAccess(userId, venueId);

    const r = await this.db.query<any>(
      `SELECT 
         COALESCE(u.full_name, b.external_customer_name, 'عميل ملاعبي') as customer_name,
         COALESCE(u.phone, b.external_customer_phone, 'بدون هاتف') as phone,
         COUNT(DISTINCT b.id)::int as total_bookings,
         COALESCE(SUM(b.total_price), 0)::float as total_spent,
         MAX(o.starts_at) as last_booking_date
       FROM bookings b
       JOIN field_occupancies o ON o.booking_id = b.id
       JOIN fields f ON f.id = o.field_id
       LEFT JOIN users u ON u.id = b.player_user_id
       WHERE f.venue_id = $1 AND b.status IN ('confirmed', 'completed', 'pending')
       GROUP BY 1, 2
       ORDER BY total_spent DESC, last_booking_date DESC
       LIMIT 50`,
      [venueId]
    );

    return { data: r.rows };
  }

  async listVenueReviews(userId: string, venueId: string) {
    await this.assertVenueAccess(userId, venueId);

    const r = await this.db.query<any>(
      `SELECT 
         r.id, r.rating, r.comment, r.status, r.created_at,
         COALESCE(u.full_name, 'لاعب ملاعبي') as player_name,
         f.name as field_name,
         b.booking_no
       FROM reviews r
       JOIN bookings b ON b.id = r.booking_id
       JOIN field_occupancies o ON o.booking_id = b.id
       JOIN fields f ON f.id = o.field_id
       LEFT JOIN users u ON u.id = r.player_user_id
       WHERE f.venue_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [venueId]
    );

    return { data: r.rows };
  }

  async getVenueReports(userId: string, venueId: string, range: string = '30d') {
    await this.assertVenueAccess(userId, venueId);

    const daysRes = await this.db.query<any>(
      `WITH days AS (
         SELECT generate_series(
           (CURRENT_DATE - interval '13 days')::date,
           CURRENT_DATE::date,
           '1 day'::interval
         )::date AS d
       )
       SELECT 
         days.d as date_str,
         TO_CHAR(days.d, 'Dy') as day_code,
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0)::float as revenue,
         COUNT(b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))::int as bookings_count
       FROM days
       LEFT JOIN field_occupancies o ON (o.starts_at AT TIME ZONE 'Asia/Aden')::date = days.d
       LEFT JOIN fields f ON f.id = o.field_id AND f.venue_id = $1
       LEFT JOIN bookings b ON b.id = o.booking_id
       GROUP BY days.d
       ORDER BY days.d ASC`,
      [venueId]
    );

    const arDays: Record<string, string> = {
      'Sat': 'السبت',
      'Sun': 'الأحد',
      'Mon': 'الإثنين',
      'Tue': 'الثلاثاء',
      'Wed': 'الأربعاء',
      'Thu': 'الخميس',
      'Fri': 'الجمعة'
    };

    const dailyBreakdown = daysRes.rows.map((row: any) => ({
      date: row.date_str,
      day_name: arDays[row.day_code?.trim()] || row.day_code?.trim(),
      revenue: Number(row.revenue || 0),
      bookings_count: Number(row.bookings_count || 0)
    }));

    const totRes = await this.db.query<any>(
      `SELECT 
         COALESCE(SUM(b.total_price) FILTER (WHERE b.status IN ('confirmed', 'completed')), 0)::float as total_revenue,
         COUNT(DISTINCT b.id) FILTER (WHERE b.status IN ('confirmed', 'completed'))::int as total_bookings
       FROM bookings b
       JOIN field_occupancies o ON o.booking_id = b.id
       JOIN fields f ON f.id = o.field_id
       WHERE f.venue_id = $1 
         AND o.starts_at >= (CURRENT_DATE - interval '30 days')`,
      [venueId]
    );

    const totalRev = Number(totRes.rows[0]?.total_revenue || 0);
    const totalBookings = Number(totRes.rows[0]?.total_bookings || 0);
    const avgDaily = Math.round(totalRev / 30);

    return {
      total_revenue: totalRev,
      avg_daily_revenue: avgDaily,
      total_bookings: totalBookings,
      occupancy_rate: totalBookings > 0 ? Math.min(100, Math.round((totalBookings / (30 * 18)) * 100)) : 0,
      currency: 'YER',
      daily_breakdown: dailyBreakdown
    };
  }

  async getFieldSettings(userId: string, venueId: string, fieldId: string) {
    await this.assertVenueAccess(userId, venueId, ['owner', 'manager']);

    const r = await this.db.query<any>(
      `SELECT bs.field_id, bs.confirmation_mode, bs.instant_booking_enabled,
              bs.deposit_mode, bs.deposit_enabled, bs.deposit_value
       FROM booking_settings bs
       JOIN fields f ON f.id = bs.field_id
       WHERE bs.field_id = $1 AND f.venue_id = $2`,
      [fieldId, venueId]
    );

    if (!r.rowCount) {
      return {
        field_id: fieldId,
        confirmation_mode: 'approval',
        instant_booking_enabled: false,
        deposit_mode: 'none',
        deposit_enabled: false
      };
    }

    return r.rows[0];
  }

  async updateFieldSettings(userId: string, venueId: string, fieldId: string, dto: UpdateBookingSettingsDto) {
    await this.assertVenueAccess(userId, venueId, ['owner', 'manager']);

    const isInstant = dto.confirmation_mode === 'instant';
    const instantEnabled = isInstant ? (dto.instant_booking_enabled ?? true) : false;

    const r = await this.db.query<any>(
      `INSERT INTO booking_settings(field_id, confirmation_mode, instant_booking_enabled, deposit_mode, deposit_enabled)
       VALUES ($1, $2, $3, 'none', false)
       ON CONFLICT (field_id) DO UPDATE
       SET confirmation_mode = EXCLUDED.confirmation_mode,
           instant_booking_enabled = EXCLUDED.instant_booking_enabled
       RETURNING field_id, confirmation_mode, instant_booking_enabled, deposit_mode, deposit_enabled`,
      [fieldId, dto.confirmation_mode, instantEnabled]
    );

    await this.db.query(
      `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'field.update_settings', 'booking_settings', $3, $4::jsonb)`,
      [userId, venueId, fieldId, JSON.stringify({ confirmation_mode: dto.confirmation_mode, instant_booking_enabled: instantEnabled })]
    );

    return r.rows[0];
  }

  async listVenueMembers(userId: string, venueId: string) {
    await this.assertVenueAccess(userId, venueId, ['owner', 'manager']);

    const r = await this.db.query<any>(
      `SELECT vm.id, vm.venue_id, vm.user_id, vm.role, vm.status, vm.created_at,
              u.full_name, u.email, u.phone
       FROM venue_members vm
       JOIN users u ON u.id = vm.user_id
       WHERE vm.venue_id = $1 AND vm.status != 'revoked'
       ORDER BY vm.created_at ASC`,
      [venueId]
    );

    return { data: r.rows };
  }

  async addVenueMember(userId: string, venueId: string, dto: AddVenueMemberDto) {
    await this.assertVenueAccess(userId, venueId, ['owner']);

    if (!dto.email && !dto.phone) {
      throw new BadRequestException('يجب تقديم البريد الإلكتروني أو رقم الهاتف للموظف');
    }

    let userQuery = '';
    const userParams: any[] = [];
    if (dto.email) {
      userParams.push(dto.email.trim().toLowerCase());
      userQuery = 'LOWER(email) = $1';
    } else {
      userParams.push(dto.phone?.trim());
      userQuery = 'phone = $1';
    }

    const userRes = await this.db.query<any>(
      `SELECT id, full_name, email, phone FROM users WHERE ${userQuery}`,
      userParams
    );

    if (!userRes.rowCount) {
      throw new NotFoundException('المستخدم غير موجود في منصة ملاعبي؛ يجب أن ينشئ حساباً أولاً');
    }

    const targetUser = userRes.rows[0];

    const venueRes = await this.db.query<any>(
      `SELECT owner_user_id FROM venues WHERE id = $1`,
      [venueId]
    );
    if (venueRes.rows[0]?.owner_user_id === targetUser.id) {
      throw new ConflictException('المستخدم هو مالك المنشأة بالفعل');
    }

    const memRes = await this.db.query<any>(
      `INSERT INTO venue_members(venue_id, user_id, role, status, invited_by)
       VALUES ($1, $2, $3, 'active', $4)
       ON CONFLICT (venue_id, user_id) DO UPDATE
       SET role = EXCLUDED.role, status = 'active'
       RETURNING id, venue_id, user_id, role, status, created_at`,
      [venueId, targetUser.id, dto.role, userId]
    );

    await this.db.query(
      `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'member.add', 'venue_member', $3, $4::jsonb)`,
      [userId, venueId, memRes.rows[0].id, JSON.stringify({ role: dto.role, target_user: targetUser.email || targetUser.phone })]
    );

    return {
      success: true,
      member: {
        ...memRes.rows[0],
        full_name: targetUser.full_name,
        email: targetUser.email,
        phone: targetUser.phone
      }
    };
  }

  async removeVenueMember(userId: string, venueId: string, memberId: string) {
    await this.assertVenueAccess(userId, venueId, ['owner']);

    const r = await this.db.query<any>(
      `DELETE FROM venue_members WHERE id = $1 AND venue_id = $2 RETURNING id, user_id, role`,
      [memberId, venueId]
    );

    if (!r.rowCount) {
      throw new NotFoundException('عضو الفريق غير موجود');
    }

    await this.db.query(
      `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'member.remove', 'venue_member', $3, $4::jsonb)`,
      [userId, venueId, memberId, JSON.stringify(r.rows[0])]
    );

    return { success: true };
  }

  async listAreas() {
    const r = await this.db.query<any>(
      `SELECT a.id, a.name as area_name, d.name as district_name, g.name as governorate_name
       FROM areas a
       JOIN districts d ON d.id = a.district_id
       JOIN governorates g ON g.id = d.governorate_id
       ORDER BY a.name ASC`
    );
    return { data: r.rows };
  }

  async createVenue(userId: string, dto: CreateVenueDto) {
    return this.db.tx(async (c) => {
      // 1. Resolve area_id if not provided
      let areaId = dto.area_id;
      if (!areaId) {
        const aRes = await c.query<any>('SELECT id FROM areas ORDER BY name ASC LIMIT 1');
        areaId = aRes.rows[0]?.id;
      }

      // 2. Create venue (status = 'active' for immediate availability)
      const vRes = await c.query<any>(
        `INSERT INTO venues(owner_user_id, area_id, name, description, address_text, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [
          userId,
          areaId,
          dto.name.trim(),
          dto.description?.trim() || null,
          dto.address_text?.trim() || null,
          dto.phone?.trim() || null
        ]
      );
      const venue = vRes.rows[0];

      // 3. Create first field
      const fRes = await c.query<any>(
        `INSERT INTO fields(venue_id, name, sport_type, capacity, surface_type, status)
         VALUES ($1, $2, 'football', $3, $4, 'active')
         RETURNING *`,
        [
          venue.id,
          dto.field_name.trim(),
          dto.capacity || 10,
          dto.surface_type || 'عشب صناعي'
        ]
      );
      const field = fRes.rows[0];

      // 4. Create opening hours (0..6)
      const opensAt = dto.opens_at ? `${dto.opens_at.slice(0, 5)}:00` : '06:00:00';
      const closesAt = dto.closes_at ? (dto.closes_at === '24:00' ? '24:00:00' : `${dto.closes_at.slice(0, 5)}:00`) : '24:00:00';

      for (let day = 0; day <= 6; day++) {
        await c.query(
          `INSERT INTO opening_hours(field_id, weekday, opens_at, closes_at, is_closed)
           VALUES ($1, $2, $3, $4, false)
           ON CONFLICT DO NOTHING`,
          [field.id, day, opensAt, closesAt]
        );

        // 5. Create pricing rule (0..6)
        const price = dto.hourly_price || 7000;
        await c.query(
          `INSERT INTO pricing_rules(field_id, weekday, starts_at, ends_at, price, currency, priority, active)
           VALUES ($1, $2, $3, $4, $5, 'YER', 0, true)`,
          [field.id, day, opensAt, closesAt, price]
        );
      }

      // 6. Create booking settings
      const confMode = dto.confirmation_mode || 'approval';
      const isInstant = confMode === 'instant';
      await c.query(
        `INSERT INTO booking_settings(field_id, confirmation_mode, instant_booking_enabled, deposit_mode, deposit_enabled)
         VALUES ($1, $2, $3, 'none', false)
         ON CONFLICT (field_id) DO UPDATE SET
           confirmation_mode = EXCLUDED.confirmation_mode,
           instant_booking_enabled = EXCLUDED.instant_booking_enabled`,
        [field.id, confMode, isInstant]
      );

      // 7. Register user as active owner in venue_members
      await c.query(
        `INSERT INTO venue_members(venue_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (venue_id, user_id) DO NOTHING`,
        [venue.id, userId]
      );

      // 8. Audit log
      await c.query(
        `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'venue.create', 'venues', $3, $4::jsonb)`,
        [userId, venue.id, venue.id, JSON.stringify({ name: venue.name, field_name: field.name })]
      );

      return {
        ...venue,
        fields: [{
          ...field,
          confirmation_mode: confMode,
          instant_booking_enabled: isInstant,
          hourly_price_from: dto.hourly_price || 7000
        }]
      };
    });
  }

  async updateVenue(userId: string, venueId: string, dto: UpdateVenueDto) {
    await this.assertVenueAccess(userId, venueId, ['owner', 'manager']);

    const updates: string[] = [];
    const values: any[] = [venueId];

    if (dto.name !== undefined) {
      values.push(dto.name.trim());
      updates.push(`name = $${values.length}`);
    }
    if (dto.area_id !== undefined) {
      values.push(dto.area_id);
      updates.push(`area_id = $${values.length}`);
    }
    if (dto.address_text !== undefined) {
      values.push(dto.address_text?.trim() || null);
      updates.push(`address_text = $${values.length}`);
    }
    if (dto.description !== undefined) {
      values.push(dto.description?.trim() || null);
      updates.push(`description = $${values.length}`);
    }
    if (dto.phone !== undefined) {
      values.push(dto.phone?.trim() || null);
      updates.push(`phone = $${values.length}`);
    }

    if (updates.length === 0) {
      const r = await this.db.query('SELECT * FROM venues WHERE id = $1', [venueId]);
      return r.rows[0];
    }

    updates.push(`updated_at = now()`);

    const r = await this.db.query<any>(
      `UPDATE venues SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    await this.db.query(
      `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'venue.update', 'venues', $2, $3::jsonb)`,
      [userId, venueId, JSON.stringify(dto)]
    );

    return r.rows[0];
  }

  async addField(userId: string, venueId: string, dto: CreateFieldDto) {
    await this.assertVenueAccess(userId, venueId, ['owner', 'manager']);

    return this.db.tx(async (c) => {
      const fRes = await c.query<any>(
        `INSERT INTO fields(venue_id, name, sport_type, capacity, surface_type, status)
         VALUES ($1, $2, 'football', $3, $4, 'active')
         RETURNING *`,
        [
          venueId,
          dto.name.trim(),
          dto.capacity || 10,
          dto.surface_type || 'عشب صناعي'
        ]
      );
      const field = fRes.rows[0];

      const opensAt = dto.opens_at ? `${dto.opens_at.slice(0, 5)}:00` : '06:00:00';
      const closesAt = dto.closes_at ? (dto.closes_at === '24:00' ? '24:00:00' : `${dto.closes_at.slice(0, 5)}:00`) : '24:00:00';
      const price = dto.hourly_price || 7000;

      for (let day = 0; day <= 6; day++) {
        await c.query(
          `INSERT INTO opening_hours(field_id, weekday, opens_at, closes_at, is_closed)
           VALUES ($1, $2, $3, $4, false)
           ON CONFLICT DO NOTHING`,
          [field.id, day, opensAt, closesAt]
        );

        await c.query(
          `INSERT INTO pricing_rules(field_id, weekday, starts_at, ends_at, price, currency, priority, active)
           VALUES ($1, $2, $3, $4, $5, 'YER', 0, true)`,
          [field.id, day, opensAt, closesAt, price]
        );
      }

      const confMode = dto.confirmation_mode || 'approval';
      const isInstant = confMode === 'instant';
      await c.query(
        `INSERT INTO booking_settings(field_id, confirmation_mode, instant_booking_enabled, deposit_mode, deposit_enabled)
         VALUES ($1, $2, $3, 'none', false)
         ON CONFLICT (field_id) DO UPDATE SET
           confirmation_mode = EXCLUDED.confirmation_mode,
           instant_booking_enabled = EXCLUDED.instant_booking_enabled`,
        [field.id, confMode, isInstant]
      );

      await c.query(
        `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'field.create', 'fields', $3, $4::jsonb)`,
        [userId, venueId, field.id, JSON.stringify({ name: field.name })]
      );

      return {
        ...field,
        confirmation_mode: confMode,
        instant_booking_enabled: isInstant,
        hourly_price_from: price
      };
    });
  }

  async getVenueImages(userId: string, venueId: string) {
    await this.assertVenueAccess(userId, venueId);
    const res = await this.db.query<any>(
      `SELECT id, venue_id, image_url, sort_order, created_at 
       FROM venue_images 
       WHERE venue_id = $1 
       ORDER BY sort_order ASC, created_at ASC`,
      [venueId]
    );
    return { data: res.rows };
  }

  async uploadVenueImage(userId: string, venueId: string, file: any) {
    await this.assertVenueAccess(userId, venueId);

    if (!file || !file.buffer) {
      throw new BadRequestException('ملف الصورة غير موجود أو تالف');
    }

    await this.supabase.ensureBucket('venue-images', true);

    const ext = file.originalname?.split('.').pop()?.toLowerCase() || 'jpg';
    const cleanExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
    const fileName = `${Date.now()}-${randomUUID()}.${cleanExt}`;
    const storagePath = `venues/${venueId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await this.supabase.adminClient.storage
      .from('venue-images')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw new BadRequestException(`فشل رفع الصورة إلى الخادم: ${uploadError.message}`);
    }

    const { data: pubData } = this.supabase.adminClient.storage
      .from('venue-images')
      .getPublicUrl(storagePath);

    const publicUrl = pubData?.publicUrl;
    if (!publicUrl) {
      throw new BadRequestException('تعذر الحصول على الرابط العام للصورة');
    }

    const maxSortRes = await this.db.query<any>(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort FROM venue_images WHERE venue_id = $1`,
      [venueId]
    );
    const nextSort = maxSortRes.rows[0]?.next_sort || 1;

    const insertRes = await this.db.query<any>(
      `INSERT INTO venue_images (id, venue_id, image_url, sort_order, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, venue_id, image_url, sort_order, created_at`,
      [randomUUID(), venueId, publicUrl, nextSort]
    );

    const imageRecord = insertRes.rows[0];
    return {
      success: true,
      id: imageRecord.id,
      image_url: imageRecord.image_url,
      data: imageRecord
    };
  }

  async deleteVenueImage(userId: string, venueId: string, imageId: string) {
    await this.assertVenueAccess(userId, venueId);

    const imgRes = await this.db.query<any>(
      `SELECT id, image_url FROM venue_images WHERE id = $1 AND venue_id = $2`,
      [imageId, venueId]
    );
    if (!imgRes.rowCount) {
      throw new NotFoundException('الصورة غير موجودة أو تم حذفها مسبقاً');
    }

    const imageUrl = imgRes.rows[0].image_url;
    try {
      const marker = '/venue-images/';
      const idx = imageUrl.indexOf(marker);
      if (idx !== -1) {
        const storagePath = imageUrl.slice(idx + marker.length);
        await this.supabase.adminClient.storage.from('venue-images').remove([storagePath]);
      }
    } catch (e) {
      console.warn('Could not remove file from Supabase storage:', e);
    }

    await this.db.query(
      `DELETE FROM venue_images WHERE id = $1 AND venue_id = $2`,
      [imageId, venueId]
    );

    return { success: true, message: 'تم حذف الصورة بنجاح' };
  }
}
