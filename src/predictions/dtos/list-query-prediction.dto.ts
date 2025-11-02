import { ListQuerySchema } from 'src/common/dto/list-query.dto';
import z from 'zod';

export const PredictionsListSchema = ListQuerySchema.extend({
  predictedClass: z.enum(['YES', 'NO']).optional(),
  customerId: z.string().optional(),
  source: z.string().optional(),
  probYesMin: z.coerce.number().min(0).max(1).optional(),
  probYesMax: z.coerce.number().min(0).max(1).optional(),
  probNoMin: z.coerce.number().min(0).max(1).optional(),
  probNoMax: z.coerce.number().min(0).max(1).optional(),
});
export type PredictionsListDto = z.infer<typeof PredictionsListSchema>;
