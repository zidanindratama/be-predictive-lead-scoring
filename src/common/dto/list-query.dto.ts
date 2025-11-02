import { z } from 'zod';

export const ListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sortBy: z.string().trim().optional(),
    sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
    q: z.string().trim().optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .passthrough();

export type ListQueryDto = z.infer<typeof ListQuerySchema>;
