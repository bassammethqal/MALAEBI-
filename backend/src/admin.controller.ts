import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from './jwt.guard';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { AdminCreateVenueDto, AdminUpdateVenueStatusDto } from './dto';

@Controller('admin')
@UseGuards(JwtGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    return this.adminService.getOverview();
  }

  @Get('venues')
  async getVenues() {
    return this.adminService.getVenues();
  }

  @Post('venues')
  async createVenue(@Req() req: any, @Body() dto: AdminCreateVenueDto) {
    return this.adminService.createVenueWithOwner(req.user.id, dto);
  }

  @Patch('venues/:venueId/status')
  async updateVenueStatus(
    @Req() req: any,
    @Param('venueId') venueId: string,
    @Body() dto: AdminUpdateVenueStatusDto
  ) {
    return this.adminService.updateVenueStatus(req.user.id, venueId, dto.status);
  }

  @Delete('venues/:venueId')
  async deleteVenue(@Req() req: any, @Param('venueId') venueId: string) {
    return this.adminService.deleteVenue(req.user.id, venueId);
  }

  @Post('venues/:venueId/images')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVenueImage(
    @Param('venueId') venueId: string,
    @UploadedFile() file: any
  ) {
    return this.adminService.uploadVenueImage(venueId, file);
  }

  @Get('bookings')
  async getBookings() {
    return this.adminService.getBookings();
  }
}
