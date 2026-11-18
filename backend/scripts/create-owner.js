require('dotenv').config();
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

async function main() {
  const email = process.argv[2] ? process.argv[2].trim().toLowerCase() : null;
  const password = process.argv[3] ? process.argv[3].trim() : null;
  const fullName = process.argv[4] ? process.argv[4].trim() : null;
  const venueName = process.argv[5] ? process.argv[5].trim() : null;
  const phone = process.argv[6] ? process.argv[6].trim() : null;

  if (!email || !password || !fullName) {
    console.log(`
========================================================================
📋 ملاعبي — سكربت إنشاء حساب مالك منشأة جديد (MALAEBI Owner Provisioning)
========================================================================

الاستخدام:
  npm run create-owner -- <البريد_الإلكتروني> <كلمة_المرور_المؤقتة> "<اسم_المالك>" ["<اسم_المنشأة>"] ["<رقم_الهاتف>"]

أمثلة:
  npm run create-owner -- owner.star@malaebi.com TempPass123! "كابتن سيف النجم" "مجمع النجوم الرياضي" "+967771234567"
  npm run create-owner -- owner.new@malaebi.com TempPass123! "ماجد الوصابي"

ملاحظة:
  سيتم تفعيل must_change_password: true تلقائياً، ليُجبر المالك على تعيين
  كلمة مرور سرية جديدة خاصة به عند أول تسجيل دخول في بوابة المنشأة.
========================================================================
`);
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseSecret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!databaseUrl || !supabaseUrl || !supabaseSecret) {
    console.error('❌ خطأ: لم يتم العثور على DATABASE_URL أو SUPABASE_URL / SUPABASE_SECRET_KEY في ملف .env');
    process.exit(1);
  }

  const ssl = process.env.DATABASE_SSL === 'false'
    ? false
    : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' };

  const dbClient = new Client({ connectionString: databaseUrl, ssl });
  await dbClient.connect();

  const supabaseAdmin = createClient(supabaseUrl, supabaseSecret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log(`\n⏳ جاري إنشاء/تحديث حساب المالك: ${email}...`);

  try {
    let userId = null;

    // 1. Create or Update user in Supabase Auth via Admin API
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        must_change_password: true
      }
    });

    if (createError) {
      if (createError.message.includes('already registered') || createError.status === 422) {
        // User already exists, fetch and update password & metadata
        const userRow = await dbClient.query('SELECT id FROM public.users WHERE email = $1', [email]);
        if (userRow.rowCount > 0) {
          userId = userRow.rows[0].id;
        } else {
          const authUserRow = await dbClient.query('SELECT id FROM auth.users WHERE email = $1', [email]);
          if (authUserRow.rowCount > 0) userId = authUserRow.rows[0].id;
        }

        if (userId) {
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              must_change_password: true
            }
          });
          console.log(`ℹ️ تم تحديث بيانات المستخدم الحالي (ID: ${userId}) وضبط must_change_password: true`);
        } else {
          throw new Error('المستخدم موجود في Auth ولكن تعذر العثور على معرّفه: ' + createError.message);
        }
      } else {
        throw createError;
      }
    } else {
      userId = createData.user.id;
      console.log(`✅ تم إنشاء المستخدم في Supabase Auth بنجاح (ID: ${userId})`);
    }

    // 2. Insert or Update public.users
    await dbClient.query(
      `INSERT INTO public.users(id, email, full_name, phone, email_verified_at, status)
       VALUES ($1, $2, $3, $4, NOW(), 'active')
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         full_name = EXCLUDED.full_name,
         phone = COALESCE(EXCLUDED.phone, public.users.phone),
         email_verified_at = COALESCE(public.users.email_verified_at, NOW()),
         status = 'active'`,
      [userId, email, fullName, phone || null]
    );
    console.log(`✅ تم تسجيل المالك في جدول users بنجاح.`);

    // 3. Optionally provision venue & field if venueName is specified
    let createdVenue = null;
    if (venueName) {
      const areaRow = await dbClient.query('SELECT id FROM areas LIMIT 1');
      const areaId = areaRow.rowCount > 0 ? areaRow.rows[0].id : null;

      const vRes = await dbClient.query(
        `INSERT INTO public.venues(owner_user_id, name, area_id, address_text, description, phone, status)
         VALUES ($1, $2, $3, 'مأرب - المركز', 'منشأة رياضية متكاملة بأرضيات معشبة', $4, 'active')
         RETURNING id, name`,
        [userId, venueName, areaId, phone || null]
      );
      createdVenue = vRes.rows[0];

      // Add as owner member
      await dbClient.query(
        `INSERT INTO public.venue_members(venue_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (venue_id, user_id) DO NOTHING`,
        [createdVenue.id, userId]
      );

      // Create primary field
      const fRes = await dbClient.query(
        `INSERT INTO public.fields(venue_id, name, sport_type, capacity, surface_type, status)
         VALUES ($1, 'الملعب الرئيسي', 'football', 12, 'عشب صناعي', 'active')
         RETURNING id, name`,
        [createdVenue.id]
      );
      const field = fRes.rows[0];

      // Create booking settings
      await dbClient.query(
        `INSERT INTO public.booking_settings(field_id, confirmation_mode, instant_booking_enabled, deposit_mode, deposit_enabled)
         VALUES ($1, 'approval', false, 'none', false)
         ON CONFLICT (field_id) DO UPDATE SET
           confirmation_mode = EXCLUDED.confirmation_mode,
           instant_booking_enabled = EXCLUDED.instant_booking_enabled`,
        [field.id]
      );

      // Create opening hours 06:00 - 24:00 (weekdays 0..6)
      for (let day = 0; day <= 6; day++) {
        await dbClient.query(
          `INSERT INTO public.opening_hours(field_id, weekday, opens_at, closes_at, is_closed)
           VALUES ($1, $2, '06:00:00', '24:00:00', false)
           ON CONFLICT DO NOTHING`,
          [field.id, day]
        );
      }

      // Create default pricing rule (7000 YER)
      for (let day = 0; day <= 6; day++) {
        await dbClient.query(
          `INSERT INTO public.pricing_rules(field_id, weekday, starts_at, ends_at, price, currency, priority, active)
           VALUES ($1, $2, '00:00:00', '23:59:59', 7000, 'YER', 1, true)
           ON CONFLICT DO NOTHING`,
          [field.id, day]
        );
      }

      console.log(`✅ تم إنشاء المنشأة «${createdVenue.name}» وملعبها الرئيسي وربطها بالمالك بنجاح.`);
    }

    console.log(`
========================================================================
🎉 تم تجهيز حساب المالك بنجاح!
========================================================================
  البريد الإلكتروني: ${email}
  كلمة المرور المؤقتة: ${password}
  الاسم الكامل: ${fullName}
  المنشأة: ${createdVenue ? createdVenue.name : '(سيتم إنشاؤها عبر معالج البدء عند أول دخول)'}
  إجبار تغيير كلمة المرور: نعم (must_change_password: true)
  رابط تسجيل الدخول: http://localhost:4174 (أو رابط Vercel للبوابة)
========================================================================
`);
  } catch (err) {
    console.error('❌ حدث خطأ أثناء إنشاء حساب المالك:', err);
    process.exit(1);
  } finally {
    await dbClient.end();
  }
}

main();
