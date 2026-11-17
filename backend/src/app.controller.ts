import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  index() {
    return this.welcome();
  }

  @Get('api/v1')
  apiIndex() {
    return this.welcome();
  }

  private welcome() {
    return {
      name: 'MALAEBI API',
      version: '1.0.0',
      status: 'online',
      endpoints: {
        health: '/api/v1/health',
        venues: '/api/v1/venues',
        auth_register: '/api/v1/auth/register',
        auth_login: '/api/v1/auth/login',
        auth_verify: '/api/v1/auth/email/verify'
      },
      message: 'مرحباً بك في واجهة برمجة تطبيقات ملاعبي (MALAEBI API). لتجربة واجهة اللاعب افتح الرابط: http://localhost:4173'
    };
  }
}

