import { IsEmail, IsIn, IsISO8601, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(120) full_name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(6) @MaxLength(72) password!: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) full_name?: string;
  @IsOptional() @IsString() @Matches(/^(\+9677\d{8}|)$/) phone?: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) @MaxLength(72) password!: string;
}

export class EmailOtpVerifyDto {
  @IsEmail() email!: string;
  @IsString() @Length(6, 10) code!: string;
  @IsOptional() @IsIn(['signup', 'email']) type?: string;
}

export class EmailResendDto {
  @IsEmail() email!: string;
}

export class OtpRequestDto {
  @IsString() @Matches(/^\+9677\d{8}$/) phone!: string;
}

export class OtpVerifyDto {
  @IsString() @Matches(/^\+9677\d{8}$/) phone!: string;
  @IsString() @Length(6, 10) code!: string;
  @IsOptional() @IsIn(['login', 'booking', 'staff_invitation']) purpose?: string;
}

export class CreateBookingDto {
  @IsString() @Length(36, 36) field_id!: string;
  @IsISO8601({ strict: true }) starts_at!: string;
  @IsOptional() @IsString() @MaxLength(500) player_note?: string;
}

export class RefreshDto {
  @IsString() @Length(20, 2000) refresh_token!: string;
}

export class RejectBookingDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class ExternalBookingDto {
  @IsString() @Length(36, 36) field_id!: string;
  @IsISO8601({ strict: true }) starts_at!: string;
  @IsOptional() @IsString() @MaxLength(160) customer_name?: string;
  @IsOptional() @IsString() @MaxLength(20) customer_phone?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class BlockSlotDto {
  @IsISO8601({ strict: true }) starts_at!: string;
  @IsISO8601({ strict: true }) ends_at!: string;
  @IsOptional() @IsIn(['maintenance', 'private_block']) occupancy_type?: string;
  @IsOptional() @IsString() @MaxLength(240) reason?: string;
}
