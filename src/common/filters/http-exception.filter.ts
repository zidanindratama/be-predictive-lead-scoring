import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorPayload: any = { message: 'Internal server error' };

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resp = exception.getResponse();
      if (typeof resp === 'string') {
        errorPayload = { message: resp };
      } else if (resp && typeof resp === 'object') {
        const message = (resp as any).message ?? (resp as any).error ?? 'Error';
        errorPayload = { ...resp, message };
      }
    } else if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      errorPayload = {
        message: 'Validation failed',
        issues: exception.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
          code: i.code,
        })),
      };
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.BAD_REQUEST;
      switch (exception.code) {
        case 'P2002':
          errorPayload = {
            message: 'Unique constraint violated',
            target: (exception.meta as any)?.target,
          };
          break;
        case 'P2003':
          errorPayload = {
            message: 'Foreign key constraint failed',
            field: (exception.meta as any)?.field_name,
          };
          break;
        default:
          errorPayload = { message: `Database error (${exception.code})` };
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      errorPayload = { message: 'Invalid data for database operation' };
    } else if (!isProd && exception?.message) {
      errorPayload = { message: exception.message };
    }

    this.logger.error(
      `HTTP ${status} ${req.method} ${req.url} -> ${errorPayload?.message}`,
      exception?.stack,
    );

    res.status(status).json({
      success: false,
      path: req.url,
      error: {
        ...errorPayload,
        ...(isProd ? {} : { name: exception?.name }),
      },
    });
  }
}
