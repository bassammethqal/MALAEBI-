import { Controller, Get } from '@nestjs/common';
import { DbService } from './db.service';
@Controller('health')
export class HealthController {
 constructor(private db:DbService) {}
 @Get() async check(){await this.db.query('SELECT 1');return {status:'ok',database:'connected',service:'malaebi-api'};}
}
