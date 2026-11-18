import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { DbService } from './db.service';
import { PlayerController } from './player.controller';
import { PlayerService } from './player.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtGuard } from './jwt.guard';
import { SupabaseService } from './supabase.service';
import { HealthController } from './health.controller';
import { AppController } from './app.controller';
import { BookingExpiryService } from './booking-expiry.service';
import { VenueOpsController, OwnerVenuesController, AreasController } from './venue-ops.controller';
import { VenueOpsService } from './venue-ops.service';

@Module({
  imports: [ScheduleModule.forRoot(), ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }])],
  controllers: [AppController, PlayerController, AuthController, HealthController, VenueOpsController, OwnerVenuesController, AreasController],
  providers: [
    DbService,
    PlayerService,
    AuthService,
    JwtGuard,
    SupabaseService,
    BookingExpiryService,
    VenueOpsService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ],
})
export class AppModule {}
