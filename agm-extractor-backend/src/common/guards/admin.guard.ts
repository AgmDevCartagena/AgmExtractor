import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

/**
 * Permite el acceso solo a super admins: usuarios con `role === 'admin'`
 * o cuyo id esté en la variable de entorno ADMIN_USER_IDS.
 * El AuthGuard global ya garantiza que `request.user` existe.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminUserIds = (process.env.ADMIN_USER_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado.');
    }

    const esAdmin =
      user.role === 'admin' || this.adminUserIds.includes(user.id);

    if (!esAdmin) {
      throw new ForbiddenException('Requiere privilegios de administrador.');
    }

    return true;
  }
}
