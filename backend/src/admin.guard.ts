import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException('يتطلب الوصول إلى لوحة الإدارة تسجيل الدخول أولاً');
    }

    const adminEmailsRaw = process.env.ADMIN_EMAILS || 'bsammthqal7@gmail.com,malaebi12@gmail.com';
    const adminEmails = adminEmailsRaw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const userEmail = (user.email || '').trim().toLowerCase();
    const isEmailAdmin = !!userEmail && adminEmails.includes(userEmail);
    const isRoleAdmin = user.app_metadata?.role === 'admin';

    if (!isEmailAdmin && !isRoleAdmin) {
      throw new ForbiddenException('عذراً، هذه المنطقة مخصصة للإدارة العليا لمنصة ملاعبي فقط');
    }

    return true;
  }
}
