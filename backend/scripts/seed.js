require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in environment.');
    process.exit(1);
  }

  const ssl = process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' };

  const client = new Client({ connectionString: databaseUrl, ssl });
  await client.connect();

  console.log('Connected to database. Starting idempotent seed...');

  try {
    await client.query('BEGIN');

    // 1. Resolve or Create Default Owner User
    const ownerPhone = '+967770000001';
    let ownerUserId = null;

    // Check if auth.users exists (Supabase environment)
    const hasAuthUsers = (await client.query(
      "SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users'"
    )).rowCount > 0;

    if (hasAuthUsers) {
      const authUserRow = await client.query(
        "SELECT id FROM auth.users WHERE phone = $1",
        [ownerPhone]
      );

      if (authUserRow.rowCount > 0) {
        ownerUserId = authUserRow.rows[0].id;
        console.log(`Found existing auth user: ${ownerUserId}`);
      } else {
        // Try creating via Supabase Admin SDK if credentials exist
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (supabaseUrl && supabaseSecret) {
          try {
            const supabaseAdmin = createClient(supabaseUrl, supabaseSecret, {
              auth: { persistSession: false, autoRefreshToken: false }
            });
            const { data, error } = await supabaseAdmin.auth.admin.createUser({
              phone: ownerPhone,
              phone_confirm: true,
              user_metadata: { full_name: 'مالك ملاعبي الافتراضي' }
            });
            if (error) throw error;
            ownerUserId = data.user.id;
            console.log(`Created auth user via Supabase Admin SDK: ${ownerUserId}`);
          } catch (e) {
            console.warn(`Could not create via Admin SDK (${e.message}), attempting direct DB insert into auth.users...`);
          }
        }

        // Direct DB insert if Admin SDK failed or not configured
        if (!ownerUserId) {
          const inserted = await client.query(
            `INSERT INTO auth.users(
               id, instance_id, aud, role, phone, phone_confirmed_at,
               raw_app_meta_data, raw_user_meta_data, created_at, updated_at
             )
             VALUES (
               gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
               $1, now(), '{"provider":"phone","providers":["phone"]}'::jsonb,
               '{"full_name":"مالك ملاعبي الافتراضي"}'::jsonb, now(), now()
             )
             RETURNING id`,
            [ownerPhone]
          );
          ownerUserId = inserted.rows[0].id;
          console.log(`Inserted directly into auth.users: ${ownerUserId}`);
        }
      }
    }

    // Ensure public.users record exists
    if (ownerUserId) {
      await client.query(
        `INSERT INTO public.users(id, phone, full_name, status, phone_verified_at)
         VALUES ($1, $2, 'مالك ملاعبي الافتراضي', 'active', now())
         ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, phone_verified_at = now()`,
        [ownerUserId, ownerPhone]
      );
    } else {
      const userRes = await client.query(
        `INSERT INTO public.users(phone, full_name, status, phone_verified_at)
         VALUES ($1, 'مالك ملاعبي الافتراضي', 'active', now())
         ON CONFLICT (phone) DO UPDATE SET full_name = EXCLUDED.full_name, phone_verified_at = now()
         RETURNING id`,
        [ownerPhone]
      );
      ownerUserId = userRes.rows[0].id;
    }
    console.log(`Owner profile verified in public.users: ${ownerUserId}`);

    // 2. Geography: Governorate, District, and Areas
    const govRes = await client.query(
      `INSERT INTO governorates(name)
       VALUES ('مأرب')
       ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`
    );
    const govId = govRes.rows[0].id;

    const distRes = await client.query(
      `INSERT INTO districts(governorate_id, name)
       VALUES ($1, 'مدينة مأرب')
       ON CONFLICT (governorate_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [govId]
    );
    const distId = distRes.rows[0].id;

    const areaNames = ['حي الجامعة', 'شارع صنعاء', 'المجمع'];
    const areaMap = {};
    for (const an of areaNames) {
      const ar = await client.query(
        `INSERT INTO areas(district_id, name)
         VALUES ($1, $2)
         ON CONFLICT (district_id, name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [distId, an]
      );
      areaMap[an] = ar.rows[0].id;
    }
    console.log('Geography seeded (Governorate, District, 3 Areas).');

    // 3. Amenities
    const amenitiesData = [
      { name: 'عشب صناعي', icon_key: 'grass' },
      { name: 'إضاءة ليلية', icon_key: 'night' },
      { name: 'مواقف سيارات', icon_key: 'parking' },
      { name: 'غرف تبديل', icon_key: 'dressing' },
      { name: 'دورات مياه', icon_key: 'wc' }
    ];
    const amenityMap = {};
    for (const am of amenitiesData) {
      const amRes = await client.query(
        `INSERT INTO amenities(name, icon_key)
         VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET icon_key = EXCLUDED.icon_key
         RETURNING id`,
        [am.name, am.icon_key]
      );
      amenityMap[am.name] = amRes.rows[0].id;
    }
    console.log('Amenities seeded.');

    // 4. Venues & Fields matching Player PWA Demo
    const venuesData = [
      {
        name: 'ملعب مأرب الرياضي',
        area: 'حي الجامعة',
        address: 'حي الجامعة، مدينة مأرب',
        description: 'ملعب كرة قدم بعشب صناعي ومرافق مناسبة للمباريات الودية والتدريبات. تتوفر إضاءة للمباريات المسائية ومواقف للسيارات.',
        photo: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=85',
        mode: 'instant',
        instantEnabled: true,
        price: 7000,
        amenities: ['عشب صناعي', 'إضاءة ليلية', 'مواقف سيارات']
      },
      {
        name: 'ملعب الوحدة',
        area: 'شارع صنعاء',
        address: 'شارع صنعاء، مدينة مأرب',
        description: 'مساحة لعب مريحة مناسبة للأصدقاء والفرق الصغيرة، مع مرافق أساسية وخيارات متعددة للمواعيد.',
        photo: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1000&q=85',
        mode: 'approval',
        instantEnabled: false,
        price: 6000,
        amenities: ['عشب صناعي', 'غرف تبديل', 'دورات مياه']
      },
      {
        name: 'ملعب الأبطال',
        area: 'المجمع',
        address: 'المجمع، مدينة مأرب',
        description: 'ملعب مجهز للمباريات التنافسية، مع أرضية جيدة وإضاءة ليلية ومرافق مساندة.',
        photo: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1000&q=85',
        mode: 'instant',
        instantEnabled: true,
        price: 9000,
        amenities: ['عشب صناعي', 'إضاءة ليلية', 'مواقف سيارات', 'دورات مياه']
      }
    ];

    for (const vd of venuesData) {
      // Upsert venue by owner & name
      let vRes = await client.query(
        `SELECT id FROM venues WHERE owner_user_id = $1 AND name = $2`,
        [ownerUserId, vd.name]
      );
      let venueId;
      if (vRes.rowCount > 0) {
        venueId = vRes.rows[0].id;
        await client.query(
          `UPDATE venues
           SET description = $1, address_text = $2, area_id = $3, status = 'active', verified_at = now(), updated_at = now()
           WHERE id = $4`,
          [vd.description, vd.address, areaMap[vd.area], venueId]
        );
      } else {
        const ins = await client.query(
          `INSERT INTO venues(owner_user_id, area_id, name, description, address_text, status, verified_at)
           VALUES ($1, $2, $3, $4, $5, 'active', now())
           RETURNING id`,
          [ownerUserId, areaMap[vd.area], vd.name, vd.description, vd.address]
        );
        venueId = ins.rows[0].id;
      }

      // Venue image
      await client.query(
        `DELETE FROM venue_images WHERE venue_id = $1`,
        [venueId]
      );
      await client.query(
        `INSERT INTO venue_images(venue_id, image_url, sort_order)
         VALUES ($1, $2, 0)`,
        [venueId, vd.photo]
      );

      // Upsert field
      const fieldRes = await client.query(
        `INSERT INTO fields(venue_id, name, sport_type, capacity, surface_type, status)
         VALUES ($1, 'الملعب الرئيسي', 'football', 14, 'artificial_grass', 'active')
         ON CONFLICT (venue_id, name) DO UPDATE SET status = 'active'
         RETURNING id`,
        [venueId]
      );
      const fieldId = fieldRes.rows[0].id;

      // Booking settings
      await client.query(
        `INSERT INTO booking_settings(field_id, confirmation_mode, instant_booking_enabled, deposit_mode, deposit_enabled)
         VALUES ($1, $2, $3, 'none', false)
         ON CONFLICT (field_id) DO UPDATE
         SET confirmation_mode = EXCLUDED.confirmation_mode,
             instant_booking_enabled = EXCLUDED.instant_booking_enabled,
             deposit_mode = 'none',
             deposit_enabled = false`,
        [fieldId, vd.mode, vd.instantEnabled]
      );

      // Field amenities
      for (const amName of vd.amenities) {
        if (amenityMap[amName]) {
          await client.query(
            `INSERT INTO field_amenities(field_id, amenity_id)
             VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [fieldId, amenityMap[amName]]
          );
        }
      }

      // Opening hours (Sunday=0 to Saturday=6: 06:00 to 24:00)
      await client.query(
        `DELETE FROM opening_hours WHERE field_id = $1`,
        [fieldId]
      );
      for (let day = 0; day <= 6; day++) {
        await client.query(
          `INSERT INTO opening_hours(field_id, weekday, opens_at, closes_at, is_closed)
           VALUES ($1, $2, '06:00:00', '24:00:00', false)
           ON CONFLICT (field_id, weekday, opens_at) DO UPDATE
           SET closes_at = '24:00:00', is_closed = false`,
          [fieldId, day]
        );
      }

      // Pricing rules (06:00 to 24:00 daily)
      await client.query(
        `DELETE FROM pricing_rules WHERE field_id = $1`,
        [fieldId]
      );
      await client.query(
        `INSERT INTO pricing_rules(field_id, weekday, starts_at, ends_at, price, currency, priority, active)
         VALUES ($1, NULL, '06:00:00', '24:00:00', $2, 'YER', 0, true)`,
        [fieldId, vd.price]
      );

      console.log(`Seeded venue: ${vd.name} (Field ID: ${fieldId}, Price: ${vd.price} YER, Mode: ${vd.mode})`);
    }

    await client.query('COMMIT');
    console.log('Seed completed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed, rolled back transaction:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
