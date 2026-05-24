import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class RiderOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (!user || user.userType !== 'RIDER') {
      throw new ForbiddenException('Rider access only.');
    }

    return true;
  }
}
