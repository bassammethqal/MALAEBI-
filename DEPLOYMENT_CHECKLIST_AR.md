# قائمة تشغيل ملاعبي على Supabase

## أ. حساب Supabase
- [ ] إنشاء مشروع Supabase جديد مخصص لـ MALAEBI.
- [ ] تفعيل Phone Auth.
- [ ] اختيار مزود SMS والتحقق من وصول الرسائل إلى +967.
- [ ] ضبط OTP من 6 أرقام وسياسات الإرسال والحدود وCAPTCHA.
- [ ] حفظ Project URL وPublishable key وSecret key.
- [ ] أخذ Session Pooler connection string من Connect.

## ب. قاعدة البيانات
- [ ] تشغيل `supabase login`.
- [ ] تشغيل `supabase link --project-ref <PROJECT_REF>`.
- [ ] مراجعة migrations الخمس في `supabase/migrations`.
- [ ] تشغيل `supabase db push`.
- [ ] التأكد من ظهور الجداول والـ trigger وRLS.
- [ ] التأكد من عدم وجود حسابات مستخدمين يدوية لا يقابلها `auth.users`.

## ج. Backend
- [ ] تعبئة `backend/.env` من `.env.example`.
- [ ] إبقاء `SUPABASE_SECRET_KEY` و`DATABASE_URL` على الخادم فقط.
- [ ] تشغيل `npm install` ثم `npm run build`.
- [ ] تشغيل `/api/v1/health`.
- [ ] اختبار طلب OTP والتحقق من رمز فعلي.
- [ ] اختبار إنشاء الحجز وعرضه وإلغائه.
- [ ] تشغيل اختبار التزامن بمستخدمين مختلفين للفترة نفسها.

## د. PWA
- [ ] نشر مجلد `player-pwa/MALAEBI_Player_PWA` على HTTPS.
- [ ] ضبط `config.js` على عنوان API المنشور.
- [ ] وضع `DEMO_MODE=false` فقط بعد نجاح الاختبارات.
- [ ] ضبط CORS على نطاق PWA.
- [ ] اختبار التثبيت والعمل دون اتصال على Android وiOS.
- [ ] التحقق من أن استجابات `/api/` لا تدخل Cache Storage.

## هـ. ما قبل الإطلاق
- [ ] مزود SMS يغطي اليمن ويقبل Sender ID ورسائل OTP.
- [ ] سياسة الخصوصية وشروط الاستخدام والدعم.
- [ ] إضافة منشآت وملاعب حقيقية من خلال صلاحيات الإدارة.
- [ ] نسخ احتياطي ومراقبة وتنبيهات أخطاء.
- [ ] عدم تفعيل العربون الإلكتروني قبل اعتماد مزود دفع مناسب لليمن.
