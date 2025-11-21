import { z } from 'zod';

export const ResetPasswordSchema = z.object({
  email: z.email('Invalid email format'),
  otp: z
    .string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters long'),
});

export type ResetPasswordDto = z.infer<typeof ResetPasswordSchema>;
