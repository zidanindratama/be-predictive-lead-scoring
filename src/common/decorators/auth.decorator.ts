import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../guards/jwt-access.guard';

export const Auth = (...extraGuards: any[]) =>
  applyDecorators(UseGuards(JwtAccessGuard, ...extraGuards));
