import z from 'zod';

const JsonSchema: z.ZodType<
  string | number | boolean | null | { [key: string]: any } | any[]
> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonSchema),
    z.record(z.string(), JsonSchema),
  ]),
);

const CriteriaSchema = z.record(z.string(), JsonSchema).default({});

export const CreateCampaignSchema = z.object({
  name: z.string().trim(),
  criteria: CriteriaSchema,
});

export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignSchema = CreateCampaignSchema.partial().extend({
  recompute: z.coerce.boolean().optional().default(true),
});

export type UpdateCampaignDto = z.infer<typeof UpdateCampaignSchema>;
