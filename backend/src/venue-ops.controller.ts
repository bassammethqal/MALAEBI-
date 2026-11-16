import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { VenueOpsService } from './venue-ops.service';
import { ExternalBookingDto, BlockSlotDto, RejectBookingDto } from './dto';

@Controller('venues/:venueId')
@UseGuards(JwtGuard)
export class VenueOpsController {
  constructor(private venueOps: VenueOpsService) {}

  @Get('bookings')
  bookings(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Query() query: any
  ) {
    return this.venueOps.listBookings(req.user.sub, venueId, query);
  }

  @Post('bookings/:bookingId/approve')
  approve(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Param('bookingId') bookingId: string
  ) {
    return this.venueOps.approveBooking(req.user.sub, venueId, bookingId);
  }

  @Post('bookings/:bookingId/reject')
  reject(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Param('bookingId') bookingId: string,
    @Body() dto: RejectBookingDto
  ) {
    return this.venueOps.rejectBooking(req.user.sub, venueId, bookingId, dto?.reason);
  }

  @Post('bookings/:bookingId/complete')
  complete(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Param('bookingId') bookingId: string
  ) {
    return this.venueOps.completeBooking(req.user.sub, venueId, bookingId);
  }

  @Post('bookings/external')
  external(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Body() dto: ExternalBookingDto
  ) {
    return this.venueOps.createExternalBooking(req.user.sub, venueId, dto);
  }

  @Post('fields/:fieldId/blocked-slots')
  blockSlot(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: BlockSlotDto
  ) {
    return this.venueOps.blockSlot(req.user.sub, venueId, fieldId, dto);
  }
}
