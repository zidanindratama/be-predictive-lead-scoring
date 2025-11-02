import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: ('ADMIN' | 'STAFF' | 'USER')[]) =>
  SetMetadata(ROLES_KEY, roles);
