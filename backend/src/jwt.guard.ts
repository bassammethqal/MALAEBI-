import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { DbService } from './db.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private supabase: SupabaseService, private db: DbService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw new UnauthorizedException('Missing authorization token');
    const authUser = await this.supabase.getUser(h.slice(7));
    const r = await this.db.query<any>('SELECT id, email, phone, full_name, status FROM users WHERE id=$1', [authUser.id]);
    if (!r.rowCount || r.rows[0].status !== 'active') throw new UnauthorizedException('Player account is not active');
    req.user = {
      sub: r.rows[0].id,
      id: r.rows[0].id,
      email: r.rows[0].email,
      phone: r.rows[0].phone,
      full_name: r.rows[0].full_name,
      status: r.rows[0].status
    };
    return true;
  }
}
