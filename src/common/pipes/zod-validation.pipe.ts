import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema?: ZodSchema) {}

  transform(value: unknown) {
    if (!this.schema) return value;

    let data = value;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {}
    }

    const parsed = this.schema.safeParse(data);

    if (!parsed.success) {
      const { formErrors, fieldErrors } = parsed.error.flatten();
      throw new BadRequestException({
        formErrors,
        fieldErrors,
        message: 'Error',
        name: 'BadRequestException',
      });
    }

    return parsed.data;
  }
}
