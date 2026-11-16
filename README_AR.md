# ملاعبي — حزمة إكمال تطبيق اللاعب باستخدام Supabase

هذه الحزمة تجمع:
- تطبيق Player PWA ذو 17 شاشة وخط Thmanyah Sans.
- Backend NestJS متصل بـ Supabase PostgreSQL.
- Supabase Auth للهاتف OTP والجلسات.
- SQL migrations لمخطط المشروع والقرارات التشغيلية.
- عامل انتهاء الحجوزات، إلغاء اللاعب، التقييمات، الإشعارات.
- Dockerfile وCI workflow واختبار تنافس الحجز.

## قرار المعمارية
Supabase PostgreSQL + Supabase Auth، وNestJS كطبقة منطق أعمال، وPlayer PWA كواجهة فقط. لا تُستخدم مفاتيح Supabase السرية في المتصفح.

## ترتيب التشغيل
1. أنشئ مشروع Supabase جديداً.
2. فعّل Phone Auth وأعد مزود SMS بعد التحقق من تغطية اليمن.
3. طبّق migrations عبر `supabase db push`.
4. انسخ `backend/.env.example` إلى `backend/.env` واملأ القيم من لوحة Supabase.
5. شغّل Backend: `cd backend && npm install && npm run build && npm run start:dev`.
6. اضبط `player-pwa/MALAEBI_Player_PWA/config.js` على عنوان API، ثم أوقف Demo mode بعد نجاح الاختبارات.
7. أنشئ بيانات منشآت وملاعب حقيقية من واجهة الإدارة/SQL بعد تهيئة حسابات المالكين.

التفاصيل التشغيلية في `backend/README_AR.md` و`docs/ARCHITECTURE_DECISION_SUPABASE_AR.md`.

## ما لا يمكن إتمامه دون حساباتك وخدمات خارجية
لا أستطيع إنشاء مشروع Supabase في حسابك أو نشره دون وصولك وإعداداتك. كما لا يمكن إرسال OTP إلى اليمن قبل اختيار مزود SMS والتأكد من تغطيته. لا ترسل كلمة مرور قاعدة البيانات أو مفاتيح Secret/Service Role في المحادثة؛ ضعها محلياً في `.env` أو في أسرار منصة الاستضافة.

## حدود التحقق في هذه الدفعة
تم فحص صياغة JavaScript للـ PWA وسلامة أرشيف التسليم. لم يتم تشغيل NestJS أو migrations على مشروع Supabase فعلي لعدم وجود Project URL وDatabase connection string ومفاتيح المشروع، ولم يتم إجراء اختبار تزامن على قاعدة فعلية. لا تعتبر النسخة منشورة أو جاهزة للإنتاج حتى اجتياز تلك الاختبارات.
