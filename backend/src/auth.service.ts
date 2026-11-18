import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { DbService } from './db.service';

@Injectable()
export class AuthService {
  constructor(private supabase: SupabaseService, private db: DbService) {}

  async register(fullName: string, email: string, password: string) {
    const trimmedName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Use Supabase Admin API to create user with email_confirm: true directly.
    // This avoids Supabase free tier SMTP rate limits and eliminates verification friction.
    let userRecord: any = null;
    const { data: adminData, error: adminError } = await this.supabase.adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: trimmedName }
    });

    if (adminError) {
      if (adminError.message.includes('already registered') || adminError.message.includes('User already registered') || adminError.message.includes('already exists')) {
        throw new BadRequestException('هذا البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول مباشرة');
      }
      const { data: signData, error: signError } = await this.supabase.authClient.auth.signUp({
        email: cleanEmail,
        password,
        options: { data: { full_name: trimmedName } }
      });
      if (signError) {
        if (signError.message.includes('already registered') || signError.message.includes('User already registered')) {
          throw new BadRequestException('هذا البريد الإلكتروني مسجل مسبقاً، يمكنك تسجيل الدخول مباشرة');
        }
        throw new BadRequestException(signError.message);
      }
      userRecord = signData?.user;
    } else {
      userRecord = adminData?.user;
    }

    if (userRecord) {
      await this.db.query(
        `INSERT INTO public.users(id, email, full_name, email_verified_at, status)
         VALUES ($1, $2, $3, NOW(), 'active')
         ON CONFLICT (id) DO UPDATE SET
           email = EXCLUDED.email,
           full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
           email_verified_at = COALESCE(EXCLUDED.email_verified_at, public.users.email_verified_at, NOW()),
           status = 'active'`,
        [userRecord.id, cleanEmail, trimmedName]
      );

      const loginRes = await this.supabase.authClient.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (loginRes.data?.session) {
        const profile = await this.db.query<any>(
          'SELECT id, full_name, email, phone, status FROM users WHERE id=$1',
          [userRecord.id]
        );
        return {
          requires_verification: false,
          access_token: loginRes.data.session.access_token,
          refresh_token: loginRes.data.session.refresh_token,
          token_type: 'Bearer',
          expires_in: loginRes.data.session.expires_in,
          user: profile.rows[0]
        };
      }
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

    const mustChangePassword = Boolean(data.user.user_metadata?.must_change_password);

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: 'Bearer',
      expires_in: data.session.expires_in,
      user: {
        ...profile.rows[0],
        must_change_password: mustChangePassword
      }
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
    const emailRedirectTo = process.env.PUBLIC_APP_URL || 'https://malaebi-player-psi.vercel.app';
    const { error } = await this.supabase.authClient.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo
      }
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return { accepted: true, message: 'تمت إعادة إرسال رابط التحقق إلى بريدك الإلكتروني' };
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

  async updateProfile(userId: string, dto: { full_name?: string; phone?: string }) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.full_name !== undefined) {
      const cleanName = dto.full_name.trim();
      fields.push(`full_name = $${idx++}`);
      values.push(cleanName || null);
    }

    if (dto.phone !== undefined) {
      const cleanPhone = dto.phone.trim();
      fields.push(`phone = $${idx++}`);
      values.push(cleanPhone || null);
    }

    if (!fields.length) {
      const r = await this.db.query(
        'SELECT id, full_name, email, phone, status FROM public.users WHERE id = $1',
        [userId]
      );
      return r.rows[0];
    }

    values.push(userId);
    const query = `
      UPDATE public.users
      SET ${fields.join(', ')}
      WHERE id = $${idx}
      RETURNING id, full_name, email, phone, status
    `;

    const result = await this.db.query(query, values);
    if (!result.rows.length) {
      throw new BadRequestException('المستخدم غير موجود');
    }

    if (dto.full_name) {
      try {
        await this.supabase.adminClient.auth.admin.updateUserById(userId, {
          user_metadata: { full_name: dto.full_name.trim() }
        });
      } catch {
        // Silently ignore auth admin metadata sync error
      }
    }

    return result.rows[0];
  }

  async getSupabaseUser(userId: string) {
    return this.supabase.adminClient.auth.admin.getUserById(userId);
  }

  async changePassword(userId: string, newPassword: string) {
    const { data: userRes, error: userErr } = await this.supabase.adminClient.auth.admin.getUserById(userId);
    if (userErr || !userRes?.user) {
      throw new BadRequestException('المستخدم غير موجود');
    }

    const currentMeta = userRes.user.user_metadata || {};
    const updatedMeta = { ...currentMeta, must_change_password: false };

    const { error: updateErr } = await this.supabase.adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
      user_metadata: updatedMeta
    });

    if (updateErr) {
      throw new BadRequestException(updateErr.message || 'فشل تحديث كلمة المرور');
    }

    try {
      await this.db.query(
        `INSERT INTO audit_logs(actor_user_id, venue_id, action, entity_type, entity_id, metadata)
         VALUES ($1, NULL, 'user.password_changed', 'user', $1, $2::jsonb)`,
        [userId, JSON.stringify({ timestamp: new Date().toISOString() })]
      );
    } catch (auditErr) {
      console.warn('Failed to write password change audit log:', auditErr);
    }

    // Generate fresh session so client can continue seamlessly
    let newAccessToken = null;
    let newRefreshToken = null;
    if (userRes.user.email) {
      try {
        const { data: signData } = await this.supabase.authClient.auth.signInWithPassword({
          email: userRes.user.email,
          password: newPassword
        });
        if (signData?.session) {
          newAccessToken = signData.session.access_token;
          newRefreshToken = signData.session.refresh_token;
        }
      } catch (signErr) {
        console.warn('Could not re-login after password change:', signErr);
      }
    }

    return {
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
      access_token: newAccessToken,
      refresh_token: newRefreshToken
    };
  }
}
