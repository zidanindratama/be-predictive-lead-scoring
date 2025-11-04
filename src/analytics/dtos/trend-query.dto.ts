import { z } from 'zod';

export const TrendQuerySchema = z.object({
  groupBy: z.enum(['day', 'week', 'month']).default('month'),
});

export type TrendQueryDto = z.infer<typeof TrendQuerySchema>;
