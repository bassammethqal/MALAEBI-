# ربط Player PWA بخادم ملاعبي
1. شغّل NestJS واضبط `CORS_ORIGIN` على عنوان PWA.
2. افتح `MALAEBI_Player_PWA/config.js`.
3. اضبط `API_BASE_URL` على `https://YOUR_API_DOMAIN/api/v1`.
4. بعد التأكد من تشغيل Supabase Auth وNestJS ووجود منشآت وحقول فعلية، غيّر `DEMO_MODE` إلى `false`.
5. لا تضع أي Supabase Secret/Service Role key في `config.js`.

في وضع API، يرسل التطبيق OTP إلى NestJS ثم يستقبل Supabase session، ويستخدم access token مع API. يجدد API client الجلسة عند انتهاء access token باستخدام refresh token المخزن في sessionStorage.
