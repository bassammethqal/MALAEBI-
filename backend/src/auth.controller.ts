import { Body, Controller, Get, Post, Req, Headers, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { OtpRequestDto, OtpVerifyDto, RefreshDto } from './dto';
import { JwtGuard } from './jwt.guard';
import { DbService } from './db.service';

@Controller()
export class AuthController {
 constructor(private auth:AuthService, private db:DbService) {}
 @Post('auth/otp/request') @Throttle({ default: { limit: 3, ttl: 60000 } }) request(@Body() dto:OtpRequestDto){ return this.auth.requestOtp(dto.phone); }
 @Post('auth/otp/verify') @Throttle({ default: { limit: 8, ttl: 60000 } }) verify(@Body() dto:OtpVerifyDto){ return this.auth.verifyOtp(dto.phone,dto.code); }
 @Post('auth/refresh') refresh(@Body() dto:RefreshDto){ return this.auth.refresh(dto.refresh_token); }
 @Post('auth/logout') @UseGuards(JwtGuard) logout(@Headers('authorization') h:string){return this.auth.logout(h.slice(7));}
 @Get('me') @UseGuards(JwtGuard) async me(@Req() req:any) {
  const r=await this.db.query('SELECT id,phone,full_name,status,phone_verified_at FROM users WHERE id=$1',[req.user.sub]);
  return r.rows[0] || null;
 }
}
