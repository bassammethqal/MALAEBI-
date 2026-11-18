import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import { VenueOpsService } from './venue-ops.service';
import {
  ExternalBookingDto,
  BlockSlotDto,
  RejectBookingDto,
  UpdateBookingSettingsDto,
  AddVenueMemberDto,
  CreateVenueDto,
  UpdateVenueDto,
  CreateFieldDto
} from './dto';

@Controller('areas')
export class AreasController {
  constructor(private venueOps: VenueOpsService) {}

  @Get()
  list() {
    return this.venueOps.listAreas();
  }
}

@Controller('owner/venues')
@UseGuards(JwtGuard)
export class OwnerVenuesController {
  constructor(private venueOps: VenueOpsService) {}

  @Get()
  list(@Req() req: any) {
    return this.venueOps.listOwnerVenues(req.user.sub);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateVenueDto) {
    return this.venueOps.createVenue(req.user.sub, dto);
  }
}

@Controller('venues/:venueId')
@UseGuards(JwtGuard)
export class VenueOpsController {
  constructor(private venueOps: VenueOpsService) {}

  @Patch()
  update(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Body() dto: UpdateVenueDto
  ) {
    return this.venueOps.updateVenue(req.user.sub, venueId, dto);
  }

  @Post('fields')
  addField(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Body() dto: CreateFieldDto
  ) {
    return this.venueOps.addField(req.user.sub, venueId, dto);
  }

  @Get('summary')
  summary(@Req() req: any, @Param('venueId') venueId: string) {
    return this.venueOps.getVenueSummary(req.user.sub, venueId);
  }

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

  @Get('fields/:fieldId/settings')
  getFieldSettings(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Param('fieldId') fieldId: string
  ) {
    return this.venueOps.getFieldSettings(req.user.sub, venueId, fieldId);
  }

  @Put('fields/:fieldId/settings')
  updateFieldSettings(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateBookingSettingsDto
  ) {
    return this.venueOps.updateFieldSettings(req.user.sub, venueId, fieldId, dto);
  }

  @Get('members')
  members(@Req() req: any, @Param('venueId') venueId: string) {
    return this.venueOps.listVenueMembers(req.user.sub, venueId);
  }

  @Post('members')
  addMember(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Body() dto: AddVenueMemberDto
  ) {
    return this.venueOps.addVenueMember(req.user.sub, venueId, dto);
  }

  @Delete('members/:memberId')
  removeMember(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Param('memberId') memberId: string
  ) {
    return this.venueOps.removeVenueMember(req.user.sub, venueId, memberId);
  }

  @Get('customers')
  customers(@Req() req: any, @Param('venueId') venueId: string) {
    return this.venueOps.listVenueCustomers(req.user.sub, venueId);
  }

  @Get('reviews')
  reviews(@Req() req: any, @Param('venueId') venueId: string) {
    return this.venueOps.listVenueReviews(req.user.sub, venueId);
  }

  @Get('reports')
  reports(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Query('range') range: string
  ) {
    return this.venueOps.getVenueReports(req.user.sub, venueId, range);
  }
}
