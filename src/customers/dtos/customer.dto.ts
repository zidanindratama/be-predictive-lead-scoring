import { z } from 'zod';
import { ListQuerySchema } from '../../common/dto/list-query.dto';

export const CreateCustomerSchema = z.object({
  extId: z.string().trim().optional(),
  name: z.string().trim().min(1, 'Name is required'),
  age: z.coerce.number().int().min(1).max(120),
  job: z.enum([
    'admin.',
    'blue-collar',
    'entrepreneur',
    'housemaid',
    'management',
    'retired',
    'self-employed',
    'services',
    'student',
    'technician',
    'unemployed',
    'unknown',
  ]),
  marital: z.enum(['divorced', 'married', 'single', 'unknown']),
  education: z.enum([
    'basic.4y',
    'basic.6y',
    'basic.9y',
    'high.school',
    'illiterate',
    'professional.course',
    'university.degree',
    'unknown',
  ]),
  default: z.enum(['yes', 'no', 'unknown']),
  housing: z.enum(['yes', 'no', 'unknown']),
  loan: z.enum(['yes', 'no', 'unknown']),
  contact: z.enum(['cellular', 'telephone']),
  month: z.enum([
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ]),
  day_of_week: z.enum(['mon', 'tue', 'wed', 'thu', 'fri']),
  duration: z.coerce.number().int().min(0),
  campaign: z.coerce.number().int().min(1),
  pdays: z.coerce.number().int(),
  previous: z.coerce.number().int().min(0),
  poutcome: z.enum(['failure', 'nonexistent', 'success']),
  emp_var_rate: z.coerce.number(),
  cons_price_idx: z.coerce.number(),
  cons_conf_idx: z.coerce.number(),
  euribor3m: z.coerce.number(),
  nr_employed: z.coerce.number(),
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export type UpdateCustomerDto = z.infer<typeof UpdateCustomerSchema>;

export const ListCustomersQuerySchema = ListQuerySchema.extend({
  sortBy: z
    .enum([
      'createdAt',
      'name',
      'age',
      'job',
      'marital',
      'education',
      'duration',
    ])
    .optional()
    .default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  job: CreateCustomerSchema.shape.job.optional(),
  marital: CreateCustomerSchema.shape.marital.optional(),
  education: CreateCustomerSchema.shape.education.optional(),
  contact: CreateCustomerSchema.shape.contact.optional(),

  ageMin: z.coerce.number().int().optional(),
  ageMax: z.coerce.number().int().optional(),
}).refine(
  (data) => {
    if (data.ageMin && data.ageMax && data.ageMin > data.ageMax) {
      return false;
    }
    return true;
  },
  {
    message: 'ageMin must be less than or equal to ageMax',
    path: ['ageMin'],
  },
);

export type ListCustomersQueryDto = z.infer<typeof ListCustomersQuerySchema>;
