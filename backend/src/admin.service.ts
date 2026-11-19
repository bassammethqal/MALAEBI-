import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DbService } from './db.service';
import { SupabaseService } from './supabase.service';
import { AdminCreateVenueDto } from './dto';

@Injectable()
export class AdminService {
  constructor(private db: DbService, private supabase: SupabaseService) {}

  // ==================== 1. OVERVIEW STATS ====================
  async getOverview() {
    // Venues stats
    const venuesRes = await this.db.query<any>(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END)::int as suspended,
        COUNT(CASE WHEN status = 'archived' THEN 1 END)::int as archived
      FROM venues
    `);
    const venues = venuesRes.rows[0] || { total: 0, active: 0, suspended: 0, archived: 0 };

    // Fields stats
    const fieldsRes = await this.db.query<any>(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active
      FROM fields
    `);
    const fields = fieldsRes.rows[0] || { total: 0, active: 0 };

    // Users / Players stats
    const usersRes = await this.db.query<any>(`
      SELECT 
        COUNT(*)::int as total_users,
        COUNT(CASE WHEN status = 'active' THEN 1 END)::int as active_users
      FROM users
    `);
    const users = usersRes.rows[0] || { total_users: 0, active_users: 0 };

    // Bookings stats
    const bookingsRes = await this.db.query<any>(`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'confirmed' THEN 1 END)::int as confirmed,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::int as cancelled,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int as pending_approval,
        COUNT(CASE WHEN status = 'expired' THEN 1 END)::int as expired,
        COALESCE(SUM(CASE WHEN status IN ('confirmed', 'completed') THEN total_price ELSE 0 END), 0)::numeric as total_revenue,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END)::int as today_bookings,
        COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE AND status IN ('confirmed', 'completed') THEN total_price ELSE 0 END), 0)::numeric as today_revenue
      FROM bookings
    `);
    const bookings = bookingsRes.rows[0] || {
      total: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      pending_approval: 0,
      expired: 0,
      total_revenue: 0,
      today_bookings: 0,
      today_revenue: 0
    };

    return {
      success: true,
      data: {
        venues,
        fields,
        users,
        bookings,
        generated_at: new Date().toISOString()
      }
    };
  }

  // ==================== 2. LIST ALL VENUES ====================
  async getVenues() {
    const res = await this.db.query<any>(`
      SELECT 
        v.id,
        v.name,
        v.description,
        v.address_text,
        v.phone,
        v.status,
        v.created_at,
        v.updated_at,
        a.id as area_id,
        a.name as area_name,
        u.id as owner_id,
        u.full_name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        COUNT(DISTINCT f.id)::int as fields_count,
        COUNT(DISTINCT b.id)::int as bookings_count,
        (
          SELECT vi.image_url 
          FROM venue_images vi 
          WHERE vi.venue_id = v.id 
          ORDER BY vi.sort_order ASC, vi.created_at ASC 
          LIMIT 1
        ) as cover_image_url,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', vi.id,
                'image_url', vi.image_url,
                'sort_order', vi.sort_order,
                'created_at', vi.created_at
              ) ORDER BY vi.sort_order ASC, vi.created_at ASC
            )
            FROM venue_images vi
            WHERE vi.venue_id = v.id
          ),
          '[]'::json
        ) as images
      FROM venues v
      LEFT JOIN areas a ON a.id = v.area_id
      LEFT JOIN users u ON u.id = v.owner_user_id
      LEFT JOIN fields f ON f.venue_id = v.id
      LEFT JOIN field_occupancies fo ON fo.field_id = f.id
      LEFT JOIN bookings b ON b.id = fo.booking_id
      GROUP BY v.id, a.id, u.id
      ORDER BY v.created_at DESC
    `);

    return {
      success: true,
      data: res.rows
    };
  }

  // ==================== 3. CREATE OWNER + VENUE + FIELD ====================
  async createVenueWithOwner(adminUserId: string, dto: AdminCreateVenueDto) {
    const cleanEmail = dto.owner_email.trim().toLowerCase();
    const cleanOwnerName = dto.owner_name.trim();
    const cleanPhone = dto.owner_phone?.trim() || null;
    const tempPassword = dto.temp_password?.trim() || `Malaebi${Math.floor(100000 + Math.random() * 900000)}!`;

    // 1. Supabase Auth Account Creation or Lookup
    let ownerUserId: string | null = null;
    let isExistingUser = false;

    const { data: createdAuth, error: createAuthErr } = await this.supabase.adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: cleanOwnerName,
        must_change_password: true
      }
    });

    if (createAuthErr) {
      const errMsg = createAuthErr.message || '';
      if (errMsg.includes('already registered') || errMsg.includes('already exists') || errMsg.includes('duplicate')) {
        isExistingUser = true;
        const list = await this.supabase.adminClient.auth.admin.listUsers({ perPage: 1000 });
        const existing = list.data?.users?.find((u) => u.email?.toLowerCase() === cleanEmail);
        if (existing) {
          ownerUserId = existing.id;
          // Update password and enforce password change flag
          await this.supabase.adminClient.auth.admin.updateUserById(existing.id, {
            password: tempPassword,
            user_metadata: {
              ...(existing.user_metadata || {}),
              full_name: cleanOwnerName,
              must_change_password: true
            }
          });
        } else {
          throw new BadRequestException('حساب البريد الإلكتروني مسجل مسبقاً في قاعدة المستخدمين');
        }
      } else {
        throw new BadRequestException(errMsg || 'فشل إنشاء حساب المالك في نظام المصادقة');
      }
    } else if (createdAuth?.user) {
      ownerUserId = createdAuth.user.id;
    }

    if (!ownerUserId) {
      throw new BadRequestException('تعذر الحصول على معرّف حساب المالك');
    }

    // 2. Database Transaction: Setup User, Venue, Field, Hours, Pricing, Settings, Members
    return this.db.tx(async (c) => {
      // Ensure user record in PostgreSQL
      await c.query(
        `INSERT INTO users(id, email, phone, full_name, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (id) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           phone = COALESCE(EXCLUDED.phone, users.phone),
           status = 'active'`,
        [ownerUserId, cleanEmail, cleanPhone, cleanOwnerName]
      );

      // Resolve area_id
      let areaId = dto.area_id;
      if (!areaId) {
        const aRes = await c.query<any>('SELECT id FROM areas ORDER BY name ASC LIMIT 1');
        areaId = aRes.rows[0]?.id;
      }

      // Create Venue
      const vRes = await c.query<any>(
        `INSERT INTO venues(owner_user_id, area_id, name, description, address_text, phone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING *`,
        [
          ownerUserId,
          areaId,
          dto.venue_name.trim(),
          dto.description?.trim() || null,
          dto.address_text?.trim() || null,
          cleanPhone
        ]
      );
      const venue = vRes.rows[0];

      // Create First Field
      const fRes = await c.query<any>(
        `INSERT INTO fields(venue_id, name, sport_type, capacity, surface_type, status)
         VALUES ($1, $2, 'football', $3, $4, 'active')
         RETURNING *`,
        [
          venue.id,
          dto.field_name.trim(),
          dto.capacity || 12,
          dto.surface_type || 'عشب صناعي'
        ]
      );
      const field = fRes.rows[0];

      // Opening hours (0..6 from 06:00 to 24:00)
      const opensAt = '06:00:00';
      const closesAt = '24:00:00';
      const hourlyPrice = dto.hourly_price || 8000;

      for (let day = 0; day <= 6; day++) {
        await c.query(
          `INSERT INTO opening_hours(field_id, weekday, opens_at, closes_at, is_closed)
           VALUES ($1, $2, $3, $4, false)
           ON CONFLICT DO NOTHING`,
          [field.id, day, opensAt, closesAt]
        );

        await c.query(
          `INSERT INTO pricing_rules(field_id, weekday, starts_at, ends_at, price, currency, priority, active)
           VALUES ($1, $2, $3, $4, $5, 'YER', 0, true)
           ON CONFLICT DO NOTHING`,
          [field.id, day, opensAt, closesAt, hourlyPrice]
        );
      }

      // Booking settings
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

      // Register owner in venue_members
      await c.query(
        `INSERT INTO venue_members(venue_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (venue_id, user_id) DO UPDATE SET
           role = 'owner',
           status = 'active'`,
        [venue.id, ownerUserId]
      );

      // Audit log
      await c.query(
        `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
         VALUES ($1, $2, 'admin.venue.create', 'venues', $3, $4::jsonb)`,
        [
          adminUserId,
          venue.id,
          venue.id,
          JSON.stringify({
            admin_id: adminUserId,
            owner_email: cleanEmail,
            venue_name: venue.name,
            field_name: field.name,
            hourly_price: hourlyPrice
          })
        ]
      );

      return {
        success: true,
        message: 'تم إنشاء المنشأة وحساب المالك والملعب الأول بنجاح 🚀',
        data: {
          venue,
          field,
          owner: {
            id: ownerUserId,
            name: cleanOwnerName,
            email: cleanEmail,
            phone: cleanPhone,
            temp_password: tempPassword,
            is_existing_account: isExistingUser,
            must_change_password: true,
            dashboard_url: 'https://malaebi-venue-dashboard.vercel.app'
          }
        }
      };
    });
  }

  // ==================== 4. UPDATE VENUE STATUS ====================
  async updateVenueStatus(adminUserId: string, venueId: string, status: string) {
    if (!['active', 'suspended', 'archived'].includes(status)) {
      throw new BadRequestException('حالة المنشأة غير صالحة');
    }

    const res = await this.db.query<any>(
      `UPDATE venues
       SET status = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [status, venueId]
    );

    if (!res.rowCount) {
      throw new NotFoundException('المنشأة غير موجودة');
    }

    await this.db.query(
      `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'admin.venue.status_change', 'venues', $3, $4::jsonb)`,
      [adminUserId, venueId, venueId, JSON.stringify({ status })]
    );

    return {
      success: true,
      message: `تم تغيير حالة المنشأة إلى ${status} بنجاح`,
      data: res.rows[0]
    };
  }

  // ==================== 5. DELETE VENUE (SAFE CLEANUP) ====================
  async deleteVenue(adminUserId: string, venueId: string) {
    const vCheck = await this.db.query<any>('SELECT id, name FROM venues WHERE id = $1', [venueId]);
    if (!vCheck.rowCount) {
      throw new NotFoundException('المنشأة غير موجودة أو تم حذفها مسبقاً');
    }
    const venueName = vCheck.rows[0].name;

    return this.db.tx(async (c) => {
      // 1. Get all field IDs for this venue
      const fRes = await c.query<any>('SELECT id FROM fields WHERE venue_id = $1', [venueId]);
      const fieldIds = fRes.rows.map((r) => r.id);

      if (fieldIds.length > 0) {
        // 2. Get all booking IDs linked to these fields
        const bRes = await c.query<any>(
          `SELECT DISTINCT booking_id 
           FROM field_occupancies 
           WHERE field_id = ANY($1::uuid[]) AND booking_id IS NOT NULL`,
          [fieldIds]
        );
        const bookingIds = bRes.rows.map((r) => r.booking_id);

        if (bookingIds.length > 0) {
          // Delete reviews
          await c.query('DELETE FROM reviews WHERE booking_id = ANY($1::uuid[])', [bookingIds]);
          // Delete occupancies linked to bookings
          await c.query('DELETE FROM field_occupancies WHERE booking_id = ANY($1::uuid[])', [bookingIds]);
          // Delete notifications referencing these bookings if any
          // Delete bookings
          await c.query('DELETE FROM bookings WHERE id = ANY($1::uuid[])', [bookingIds]);
        }

        // Delete remaining occupancies for these fields (e.g. maintenance blocks)
        await c.query('DELETE FROM field_occupancies WHERE field_id = ANY($1::uuid[])', [fieldIds]);

        // Delete field configurations
        await c.query('DELETE FROM pricing_rules WHERE field_id = ANY($1::uuid[])', [fieldIds]);
        await c.query('DELETE FROM opening_hours WHERE field_id = ANY($1::uuid[])', [fieldIds]);
        await c.query('DELETE FROM booking_settings WHERE field_id = ANY($1::uuid[])', [fieldIds]);

        // Delete fields
        await c.query('DELETE FROM fields WHERE venue_id = $1', [venueId]);
      }

      // Delete venue images
      await c.query('DELETE FROM venue_images WHERE venue_id = $1', [venueId]);

      // Delete venue members
      await c.query('DELETE FROM venue_members WHERE venue_id = $1', [venueId]);

      // Delete audit logs for this venue
      await c.query('DELETE FROM audit_logs WHERE venue_id = $1', [venueId]);

      // Delete the venue itself
      await c.query('DELETE FROM venues WHERE id = $1', [venueId]);

      // Record admin action
      await c.query(
        `INSERT INTO audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
         VALUES ($1, 'admin.venue.delete', 'venues', $2, $3::jsonb)`,
        [adminUserId, venueId, JSON.stringify({ deleted_venue_name: venueName })]
      );

      return {
        success: true,
        message: `تم حذف منشأة «${venueName}» وجميع ملاعبها وحجوزاتها التجريبية بأمان`
      };
    });
  }

  // ==================== 6. UPLOAD VENUE IMAGE ====================
  async uploadVenueImage(venueId: string, file: any) {
    if (!file) throw new BadRequestException('ملف الصورة مطلوب');

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('صيغة الصورة غير مدعومة. يرجى اختيار JPEG أو PNG أو WebP');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('حجم الصورة يجب ألا يتجاوز 5 ميجابايت');
    }

    const vCheck = await this.db.query<any>('SELECT id FROM venues WHERE id = $1', [venueId]);
    if (!vCheck.rowCount) {
      throw new NotFoundException('المنشأة غير موجودة');
    }

    await this.supabase.ensureBucket('venue-images', true);

    const ext = file.originalname.split('.').pop()?.toLowerCase() || 'webp';
    const filename = `${randomUUID()}.${ext}`;
    const storagePath = `venues/${venueId}/${filename}`;

    const { error: uploadErr } = await this.supabase.adminClient.storage
      .from('venue-images')
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });

    if (uploadErr) {
      throw new BadRequestException(`فشل رفع الصورة إلى التخزين السحابي: ${uploadErr.message}`);
    }

    const { data: pubData } = this.supabase.adminClient.storage
      .from('venue-images')
      .getPublicUrl(storagePath);
    const publicUrl = pubData.publicUrl;

    const maxSortRes = await this.db.query<any>(
      'SELECT COALESCE(MAX(sort_order), 0) + 1 as next_sort FROM venue_images WHERE venue_id = $1',
      [venueId]
    );
    const nextSort = maxSortRes.rows[0]?.next_sort || 1;

    const insertRes = await this.db.query<any>(
      `INSERT INTO venue_images (id, venue_id, image_url, sort_order, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, venue_id, image_url, sort_order, created_at`,
      [randomUUID(), venueId, publicUrl, nextSort]
    );

    return {
      success: true,
      message: 'تم رفع صورة المنشأة بنجاح',
      data: insertRes.rows[0]
    };
  }

  // ==================== 7. PLATFORM BOOKINGS ====================
  async getBookings() {
    const res = await this.db.query<any>(`
      SELECT 
        b.id,
        b.booking_no,
        b.status,
        b.total_price,
        b.currency,
        b.created_at,
        b.confirmed_at,
        b.cancelled_at,
        b.cancellation_reason,
        v.id as venue_id,
        v.name as venue_name,
        f.id as field_id,
        f.name as field_name,
        fo.starts_at,
        fo.ends_at,
        u.id as player_id,
        u.full_name as player_name,
        u.email as player_email,
        u.phone as player_phone
      FROM bookings b
      JOIN field_occupancies fo ON fo.booking_id = b.id
      JOIN fields f ON f.id = fo.field_id
      JOIN venues v ON v.id = f.venue_id
      LEFT JOIN users u ON u.id = b.player_user_id
      ORDER BY b.created_at DESC
      LIMIT 100
    `);

    return {
      success: true,
      data: res.rows
    };
  }
}
