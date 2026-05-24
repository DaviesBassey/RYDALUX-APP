import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as any;

    if (!user || user.userType !== 'ADMIN') {
      throw new ForbiddenException('Admin access only.');
    }

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { userId: user.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true }
            }
          }
        }
      }
    });

    if (!adminUser || !adminUser.role) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    const grantedPermissions = adminUser.role.permissions.map((rp: { permission: { name: string } }) => rp.permission.name);
    const hasPermission = requiredPermissions.every(permission => grantedPermissions.includes(permission));

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions.');
    }

    return true;
  }
}
