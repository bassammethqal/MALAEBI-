import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { DbService } from './db.service';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService, private db: DbService) {}

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
      const profile = await this.db.query<any>('SELECT id, phone, full_name, status FROM users WHERE id=$1', [data.user.id]);
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

      const profile = await this.db.query<any>('SELECT id, phone, full_name, status FROM users WHERE id=$1', [session.user.id]);

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
