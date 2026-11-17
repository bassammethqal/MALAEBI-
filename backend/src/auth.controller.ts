import { Body, Controller, Get, Post, Req, Headers, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  EmailOtpVerifyDto,
  EmailResendDto,
  OtpRequestDto,
  OtpVerifyDto,
  RefreshDto
} from './dto';
import { JwtGuard } from './jwt.guard';
import { DbService } from './db.service';

@Controller()
export class AuthController {
  constructor(private auth: AuthService, private db: DbService) {}

  @Post('auth/register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.full_name, dto.email, dto.password);
  }

  @Post('auth/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Post('auth/email/verify')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  verifyEmail(@Body() dto: EmailOtpVerifyDto) {
    return this.auth.verifyEmailOtp(dto.email, dto.code, dto.type);
  }

  @Post('auth/email/resend')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  resendEmail(@Body() dto: EmailResendDto) {
    return this.auth.resendEmailOtp(dto.email);
  }

  @Post('auth/otp/request')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  request(@Body() dto: OtpRequestDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('auth/otp/verify')
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  verify(@Body() dto: OtpVerifyDto) {
    return this.auth.verifyOtp(dto.phone, dto.code);
  }

  @Post('auth/refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refresh_token);
  }

  @Post('auth/logout')
  @UseGuards(JwtGuard)
  logout(@Headers('authorization') h: string) {
    return this.auth.logout(h.slice(7));
  }

  @Get('me')
  @UseGuards(JwtGuard)
  async me(@Req() req: any) {
    const r = await this.db.query(
      'SELECT id, email, phone, full_name, status, email_verified_at, phone_verified_at FROM users WHERE id=$1',
      [req.user.sub]
    );
    return r.rows[0] || null;
  }
}
