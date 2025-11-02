import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;
