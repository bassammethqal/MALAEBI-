import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { DbService } from './db.service';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService, private db: DbService) {}

  async register(fullName: string, email: string, password: string) {
    const trimmedName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await this.supabase.authClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: trimmedName }
      }
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        throw new BadRequestException('هذا البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول مباشرة');
      }
      throw new BadRequestException(error.message);
    }

    if (data?.user) {
      await this.db.query(
        `INSERT INTO public.users(id, email, full_name, email_verified_at, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
           email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at),
           status = 'active'`,
        [data.user.id, cleanEmail, trimmedName, data.user.email_confirmed_at]
      );
    }

    if (data?.session && data?.user) {
      const profile = await this.db.query<any>(
        'SELECT id, full_name, email, phone, status FROM users WHERE id=$1',
        [data.user.id]
      );
      return {
        requires_verification: false,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: 'Bearer',
        expires_in: data.session.expires_in,
        user: profile.rows[0]
      };
    }

    return {
      requires_verification: true,
      email: cleanEmail,
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني'
    };
  }

  async login(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await this.supabase.authClient.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) {
      if (error.message.includes('Email not confirmed') || error.message.includes('Email link is invalid')) {
        throw new UnauthorizedException('يرجى تأكيد بريدك الإلكتروني أولاً باستخدام رمز التحقق المرسل إليك');
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new UnauthorizedException('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
      throw new UnauthorizedException(error.message);
    }

    if (!data?.session || !data?.user) {
      throw new UnauthorizedException('فشل تسجيل الدخول');
    }

    let profile = await this.db.query<any>(
      'SELECT id, full_name, email, phone, status FROM users WHERE id=$1',
      [data.user.id]
    );

    if (!profile.rowCount) {
      const name = data.user.user_metadata?.full_name || 'لاعب ملاعبي';
      await this.db.query(
        `INSERT INTO public.users(id, email, full_name, email_verified_at, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
           status = 'active'`,
        [data.user.id, cleanEmail, name, data.user.email_confirmed_at]
      );
      profile = await this.db.query<any>(
        'SELECT id, full_name, email, phone, status FROM users WHERE id=$1',
        [data.user.id]
      );
    }

    if (profile.rows[0].status !== 'active') {
      throw new UnauthorizedException('الحساب غير نشط');
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: 'Bearer',
      expires_in: data.session.expires_in,
      user: profile.rows[0]
    };
  }

  async verifyEmailOtp(email: string, code: string, type?: string) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    let otpType = (type || 'signup') as any;
    let { data, error } = await this.supabase.authClient.auth.verifyOtp({
      email: cleanEmail,
      token: cleanCode,
      type: otpType
    });

    // If signup verification failed, retry with 'email'
    if (error && otpType === 'signup') {
      const retry = await this.supabase.authClient.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'email'
      });
      if (!retry.error && retry.data?.session) {
        data = retry.data;
        error = null;
      }
    }

    if (error || !data?.session || !data?.user) {
      throw new UnauthorizedException(error?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
    }

    const session = data.session;
    const name = data.user.user_metadata?.full_name || 'لاعب ملاعبي';

    await this.db.query(
      `INSERT INTO public.users(id, email, full_name, email_verified_at, status)
       VALUES ($1, $2, $3, now(), 'active')
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         email_verified_at = now(),
         status = 'active'`,
      [session.user.id, cleanEmail, name]
    );

    const profile = await this.db.query<any>(
      'SELECT id, full_name, email, phone, status FROM users WHERE id=$1',
      [session.user.id]
    );

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: 'Bearer',
      expires_in: session.expires_in,
      user: profile.rows[0]
    };
  }

  async resendEmailOtp(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    const { error } = await this.supabase.authClient.auth.resend({
      type: 'signup',
      email: cleanEmail
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { accepted: true, message: 'تمت إعادة إرسال رمز التحقق إلى بريدك الإلكتروني' };
  }

  async requestOtp(phone: string) {
    const isDev = process.env.NODE_ENV !== 'production';

    const { error } = await this.supabase.authClient.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: true }
    });

    if (error) {
      const msg = error.message || '';
      const isProviderError = msg.includes('Unsupported phone provider') ||
                              msg.includes('SMS provider') ||
                              msg.includes('provider') ||
                              isDev;

      if (isProviderError) {
        return {
          accepted: true,
          message: 'تم إرسال رمز التحقق (وضع التجربة: استخدم 123456)',
          channel: 'sms_dev_fallback'
        };
      }
      throw new BadRequestException(error.message);
    }

    return { accepted: true, message: 'تم إرسال رمز التحقق إذا كان رقم الهاتف مؤهلاً', channel: 'sms' };
  }

  async verifyOtp(phone: string, code: string) {
    const isDev = process.env.NODE_ENV !== 'production';

    // 1. Try real Supabase SMS OTP first
    const { data, error } = await this.supabase.authClient.auth.verifyOtp({ phone, token: code, type: 'sms' });

    if (!error && data?.session && data?.user) {
      const profile = await this.db.query<any>('SELECT id, full_name, email, phone, status FROM users WHERE id=$1', [data.user.id]);
      if (!profile.rowCount) throw new UnauthorizedException('تعذر تجهيز ملف المستخدم؛ تحقق من trigger مزامنة Supabase Auth');
      if (profile.rows[0].status !== 'active') throw new UnauthorizedException('الحساب غير نشط');
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        token_type: 'Bearer',
        expires_in: data.session.expires_in,
        user: profile.rows[0]
      };
    }

    // 2. Dev fallback for code === '123456' when SMS provider is not configured
    if (isDev && code === '123456') {
      const cleanPhone = phone.startsWith('+') ? phone : '+' + phone;
      const digits = cleanPhone.replace(/\D/g, '');
      const devEmail = `${digits}@malaebi.local`;

      // Check if user already exists
      const { data: usersData } = await this.supabase.adminClient.auth.admin.listUsers();
      let user = usersData?.users?.find(x => x.phone === cleanPhone || x.phone === digits || x.email === devEmail);

      if (!user) {
        const created = await this.supabase.adminClient.auth.admin.createUser({
          email: devEmail,
          phone: cleanPhone,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { full_name: 'لاعب ملاعبي' }
        });
        if (created.error) {
          const listAfter = await this.supabase.adminClient.auth.admin.listUsers();
          user = listAfter.data?.users?.find(x => x.phone === cleanPhone || x.phone === digits || x.email === devEmail);
        } else {
          user = created.data.user;
        }
      }

      if (user) {
        if (user.email !== devEmail || !user.email_confirmed_at) {
          const upd = await this.supabase.adminClient.auth.admin.updateUserById(user.id, {
            email: devEmail,
            email_confirm: true,
            phone_confirm: true
          });
          if (upd.data?.user) user = upd.data.user;
        }
      } else {
        throw new UnauthorizedException('تعذر إنشاء حساب تجريبي في Supabase Auth');
      }

      // Generate magiclink to acquire authentic signed Supabase session
      const link = await this.supabase.adminClient.auth.admin.generateLink({ type: 'magiclink', email: devEmail });
      const emailOtp = link.data?.properties?.email_otp;
      if (!emailOtp) throw new UnauthorizedException('تعذر توليد رمز التحقق للجلسة');

      const verified = await this.supabase.authClient.auth.verifyOtp({ email: devEmail, token: emailOtp, type: 'email' });
      if (verified.error || !verified.data?.session) {
        throw new UnauthorizedException('تعذر توثيق جلسة المستخدم: ' + (verified.error?.message || 'Unknown'));
      }

      const session = verified.data.session;

      // Ensure public.users has active record
      await this.db.query(
        `INSERT INTO public.users(id, phone, full_name, status, phone_verified_at)
         VALUES ($1, $2, 'لاعب ملاعبي', 'active', now())
         ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone, phone_verified_at = now(), status = 'active'`,
        [session.user.id, cleanPhone]
      );

      const profile = await this.db.query<any>('SELECT id, full_name, email, phone, status FROM users WHERE id=$1', [session.user.id]);

      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        token_type: 'Bearer',
        expires_in: session.expires_in,
        user: profile.rows[0]
      };
    }

    throw new UnauthorizedException(error?.message || 'رمز التحقق غير صحيح أو منتهي الصلاحية');
  }

  async refresh(refreshToken: string) {
    const { data, error } = await this.supabase.authClient.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new UnauthorizedException('Refresh token is invalid or expired');
    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: 'Bearer',
      expires_in: data.session.expires_in
    };
  }

  async logout(accessToken: string) {
    const { error } = await this.supabase.adminClient.auth.admin.signOut(accessToken);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }
}
