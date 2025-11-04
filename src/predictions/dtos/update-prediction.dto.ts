import z from 'zod';

export const UpdatePredictionSchema = z.object({
  predictedClass: z.enum(['YES', 'NO']).optional(),
  probabilityYes: z.coerce.number().min(0).max(1).optional(),
  probabilityNo: z.coerce.number().min(0).max(1).optional(),
  source: z.string().min(1).optional(),
  timestamp: z.coerce.date().optional(),
});

export type UpdatePredictionDto = z.infer<typeof UpdatePredictionSchema>;
