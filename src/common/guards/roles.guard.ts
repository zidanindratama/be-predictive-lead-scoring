import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private r: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.r.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;

    const req = ctx.switchToHttp().getRequest();

    return roles.includes(req.user?.role);
  }
}
