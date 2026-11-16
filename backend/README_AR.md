# ملاعبي API — NestJS + Supabase

## البنية المعتمدة
- Supabase PostgreSQL هو مصدر البيانات الأساسي.
- Supabase Auth يتولى OTP والجلسات وRefresh Token وإبطال الجلسات.
- NestJS هو طبقة منطق الأعمال الوحيدة لتطبيق اللاعب.
- تطبيق PWA لا يحمل إلا عنوان API، ولا يحمل مفاتيح Supabase السرية.
- كل الحجز والتوفر والإلغاء والتقييم يمر عبر NestJS.

## إنشاء مشروع Supabase
1. أنشئ مشروعاً جديداً من لوحة Supabase.
2. من Authentication > Providers فعّل Phone.
3. أضف مزود SMS مدعوماً من Supabase، وتأكد بنفسك من دعمه لإرسال رسائل إلى أرقام اليمن (+967) ومن قبول Sender ID.
4. اضبط OTP على 6 أرقام، ومدة صلاحية مناسبة، وحدود الإرسال ومحاولات التحقق وCAPTCHA وفق خطة الإطلاق.
5. من Project Settings > API خذ Project URL وPublishable key (`SUPABASE_PUBLISHABLE_KEY`)، وSecret key (`SUPABASE_SECRET_KEY`) للخادم فقط، ومن Connect خذ Session Pooler connection string.
6. لا تضع Secret/Service Role key أو كلمة مرور قاعدة البيانات في تطبيق اللاعب أو ملفات Git.

ملاحظة: دعم مزود SMS لليمن يجب التحقق منه مباشرة قبل التعاقد؛ وجود المزود ضمن قائمة Supabase لا يعني أن اليمن مدعومة تلقائياً.

## تطبيق مخطط البيانات
من جذر المشروع:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```
أو نفّذ ملفات SQL بالترتيب من `supabase/migrations` عبر SQL Editor. استخدم مشروعاً جديداً أو قاعدة فارغة؛ هذه migrations تأسيسية وليست ترقية لقاعدة إنتاجية موجودة.

## تشغيل NestJS محلياً
```bash
cd backend
cp .env.example .env
npm install
npm run build
npm run start:dev
```
املأ `.env` بالقيم الحقيقية محلياً. `DATABASE_URL` يفضل أن يكون Session Pooler على IPv4 hosts. لا تستخدم Transaction Pooler مع اتصال pg طويل العمر.

## API
- `GET /api/v1/health`
- `POST /api/v1/auth/otp/request`
- `POST /api/v1/auth/otp/verify`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `GET /api/v1/venues`
- `GET /api/v1/venues/:venueId`
- `GET /api/v1/venues/:venueId/fields`
- `GET /api/v1/fields/:fieldId/availability?date=YYYY-MM-DD`
- `POST /api/v1/bookings` (Bearer + Idempotency-Key)
- `GET /api/v1/bookings/mine`
- `GET /api/v1/bookings/:bookingId`
- `POST /api/v1/bookings/:bookingId/cancel`
- `POST /api/v1/bookings/:bookingId/reviews`
- `GET /api/v1/notifications`

## سياسات الحجز في الكود
- مدة الحجز 60 دقيقة.
- approval mode: حجز pending لمدة 10 دقائق، ثم تنتهي صلاحيته ويحرر الإشغال تلقائياً.
- instant mode: ينشأ confirmed مباشرة عند تأكيد اللاعب النهائي؛ OTP سبق أن تحقق، والدفع عند الملعب لا يتطلب خطوة دفع إلكترونية. بذلك لا نترك حجزاً held خمس دقائق بعد اكتمال جميع خطوات اللاعب.
- قاعدة البيانات تمنع تداخل الإشغالات باستخدام Exclusion Constraint.
- مفتاح Idempotency يمنع تكرار إنشاء الحجز عند إعادة إرسال نفس الطلب.
- إلغاء اللاعب مجاني إذا كان قبل الموعد بست ساعات أو أكثر. في أقل من ست ساعات لا يوجد استرداد تلقائي للعربون.
- التقييم لا يُقبل إلا لحجز حالته completed.

## عامل انتهاء الحجوزات
NestJS Scheduler يفحص كل 30 ثانية الحجوزات pending/held المنتهية ويحوّلها إلى expired ويحرر الإشغال في معاملة واحدة. في الإنتاج شغّل نسخة واحدة من العامل أو انقلها إلى Supabase Cron/Queue مع قفل موزع إذا شغّلت عدة نسخ API.

## اختبارات
- فحص الصحة: `bash scripts/smoke-test.sh`
- اختبار تنافس حجز الفترة نفسها: `bash scripts/concurrency-test.sh` بعد إعداد المتغيرات المذكورة في السكربت.
- لا تعتبر اختبار التزامن ناجحاً إلا بعد تشغيله ضد قاعدة Supabase فعلية مع مستخدمين وحقل وفترة تجريبية.

## ما لم يتم تفعيله
- مزود SMS الفعلي: يتطلب إعداداً وموافقة وفحص تغطية اليمن من حساب Supabase ومزود الرسائل.
- الدفع الإلكتروني والعربون: يبقيان معطلين حتى التحقق من مزود يدعم اليمن.
- إشعارات SMS/WhatsApp/Push الفعلية: سجل notifications موجود، لكن قنوات الإرسال تحتاج مزوداً.
- بوابة المنشأة والإدارة: خارج نطاق تطبيق اللاعب الحالي.
