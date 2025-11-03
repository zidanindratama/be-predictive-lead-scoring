import { z } from 'zod';
import { ListQuerySchema } from '../../common/dto/list-query.dto';

export const UpdateUserSchema = z.object({
  name: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'STAFF', 'USER']).optional(),
  avatarUrl: z.url().optional().nullable(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const UserListQuerySchema = ListQuerySchema.extend({
  sortBy: z.enum(['createdAt', 'name', 'email', 'role']).optional(),
  role: z.enum(['ADMIN', 'STAFF', 'USER']).optional(),
});

export type UserListQueryDto = z.infer<typeof UserListQuerySchema>;
