import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  email: z.email('Invalid email format'),
});

export type ForgotPasswordDto = z.infer<typeof ForgotPasswordSchema>;
