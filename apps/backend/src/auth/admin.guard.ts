import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';
import type { Request } from 'express';

import { AdminRoleService } from '@/auth/admin-role.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminRoles: AdminRoleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const payload = req.authPayload;
    if (payload === undefined) {
      throw new UnauthorizedException('Missing or invalid access token');
    }

    const isAdmin = await this.adminRoles.isUserAdmin(payload.sub);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
