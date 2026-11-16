# ملحق API — إكمال دورة اللاعب

| Method | Path | Authentication | الغرض |
|---|---|---|---|
| POST | /api/v1/auth/otp/request | لا | طلب رمز SMS عبر Supabase Auth |
| POST | /api/v1/auth/otp/verify | لا | التحقق وإرجاع Supabase session |
| POST | /api/v1/auth/refresh | لا | تدوير جلسة refresh |
| POST | /api/v1/auth/logout | نعم | إبطال جلسة المستخدم |
| GET | /api/v1/me | نعم | ملف اللاعب |
| GET | /api/v1/venues | لا | استكشاف المنشآت |
| GET | /api/v1/venues/:venueId | لا | تفاصيل المنشأة |
| GET | /api/v1/venues/:venueId/fields | لا | ملاعب المنشأة |
| GET | /api/v1/fields/:fieldId/availability?date=YYYY-MM-DD | لا | الفترات المتاحة |
| POST | /api/v1/bookings | نعم + Idempotency-Key | إنشاء الحجز |
| GET | /api/v1/bookings/mine | نعم | حجوزات اللاعب |
| GET | /api/v1/bookings/:bookingId | نعم | تفاصيل الحجز |
| POST | /api/v1/bookings/:bookingId/cancel | نعم | إلغاء الحجز |
| POST | /api/v1/bookings/:bookingId/reviews | نعم | تقييم بعد الاكتمال |
| GET | /api/v1/notifications | نعم | إشعارات اللاعب |
| GET | /api/v1/health | لا | فحص الخادم وقاعدة البيانات |

## ملاحظات
- `starts_at` يرسل كـ ISO-8601 timestamp.
- كل حجز مدته 60 دقيقة.
- عند تعارض الفترة يرجع API خطأ 409.
- عند إعادة نفس الطلب بنفس Idempotency-Key والحمولة نفسها يعاد نفس الرد.
- عند استخدام المفتاح نفسه مع حمولة مختلفة يرجع 409.
- لا يوجد مسار دفع إلكتروني فعال في هذا الإصدار.
