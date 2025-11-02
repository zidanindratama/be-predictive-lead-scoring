import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'STAFF', 'USER']).optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;
