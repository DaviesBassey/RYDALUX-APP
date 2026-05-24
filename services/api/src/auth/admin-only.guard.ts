import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (!user || user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access only.');
    }

    return true;
  }
}
