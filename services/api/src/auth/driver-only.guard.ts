import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class DriverOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (!user || user.userType !== 'DRIVER') {
      throw new ForbiddenException('Driver access only.');
    }

    return true;
  }
}
