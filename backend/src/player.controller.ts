
import { Controller, Get, Post, Query, Param, Body, Headers, Req, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PlayerService } from './player.service';
import { JwtGuard } from './jwt.guard';
import { CreateBookingDto } from './dto';

class ReviewDto {
 @IsInt() @Min(1) @Max(5) rating!:number;
 @IsOptional() @IsString() @MaxLength(2000) comment?:string;
}
@Controller()
export class PlayerController {
 constructor(private player:PlayerService) {}
 @Get('venues') venues(@Query() q:any){ return this.player.listVenues(q); }
 @Get('venues/:venueId') venue(@Param('venueId') id:string){ return this.player.venue(id); }
 @Get('venues/:venueId/fields') fields(@Param('venueId') id:string){ return this.player.fields(id); }
 @Get('venues/:venueId/reviews') reviews(@Param('venueId') id:string){ return this.player.venueReviews(id); }
 @Get('fields/:fieldId/availability') availability(@Param('fieldId') id:string,@Query('date') date:string){ return this.player.availability(id,date); }
 @Post('bookings') @UseGuards(JwtGuard) create(@Req() req:any,@Body() dto:CreateBookingDto,@Headers('idempotency-key') key:string){ return this.player.createBooking(req.user.sub,dto,key); }
 @Get('notifications') @UseGuards(JwtGuard) notifications(@Req() req:any){return this.player.notifications(req.user.sub);}
 @Post('notifications/read') @UseGuards(JwtGuard) markNotificationsRead(@Req() req:any){return this.player.markNotificationsRead(req.user.sub);}
 @Get('bookings/mine') @UseGuards(JwtGuard) mine(@Req() req:any){ return this.player.myBookings(req.user.sub); }
 @Get('bookings/:bookingId') @UseGuards(JwtGuard) detail(@Req() req:any,@Param('bookingId') id:string){ return this.player.bookingDetail(req.user.sub,id); }
 @Post('bookings/:bookingId/cancel') @UseGuards(JwtGuard) cancel(@Req() req:any,@Param('bookingId') id:string){ return this.player.cancelBooking(req.user.sub,id); }
 @Post('bookings/:bookingId/reviews') @UseGuards(JwtGuard) review(@Req() req:any,@Param('bookingId') id:string,@Body() dto:ReviewDto){ return this.player.createReview(req.user.sub,id,dto.rating,dto.comment); }
}
