import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { DbService } from './db.service';
@Injectable()
export class JwtGuard implements CanActivate {
 constructor(private supabase:SupabaseService, private db:DbService) {}
 async canActivate(ctx:ExecutionContext) {
  const req=ctx.switchToHttp().getRequest(); const h=req.headers.authorization||'';
  if(!h.startsWith('Bearer ')) throw new UnauthorizedException();
  const authUser=await this.supabase.getUser(h.slice(7));
  const r=await this.db.query<any>('SELECT id,phone,status FROM users WHERE id=$1',[authUser.id]);
  if(!r.rowCount || r.rows[0].status!=='active') throw new UnauthorizedException('Player account is not active');
  req.user={sub:r.rows[0].id,phone:r.rows[0].phone}; return true;
 }
}
