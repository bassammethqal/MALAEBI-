import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  index() {
    return {
      name: 'MALAEBI API',
      version: '1.0.0',
      status: 'online',
      endpoints: {
        health: '/api/v1/health',
        venues: '/api/v1/venues',
        auth_request: '/api/v1/auth/otp/request',
        auth_verify: '/api/v1/auth/otp/verify'
      },
      message: 'مرحباً بك في واجهة برمجة تطبيقات ملاعبي (MALAEBI API). لتجربة واجهة اللاعب افتح الرابط: http://localhost:4173'
    };
  }
}
